import { create } from 'zustand'
import type {
  WaveformState,
  NormalizationMode,
  StationWaveformData,
  ProcessingContext,
  MomentTensorSolution,
  WaveformProgressLogEntry,
  SortColumn,
  SortDirection,
  DistanceGroup,
} from '@/types/waveform'
import type { StationMTContribution } from '@/types/seismology'
import type { JobSolutionEntry } from '@/lib/platform'

let progressPollTimer: ReturnType<typeof setInterval> | null = null
let progressEventSource: EventSource | null = null
let lastProgressMessage = ''

function closeProgressSources() {
  if (progressPollTimer !== null) {
    globalThis.clearInterval(progressPollTimer)
    progressPollTimer = null
  }

  if (progressEventSource) {
    progressEventSource.close()
    progressEventSource = null
  }
}

function parseProgressLogEvent(raw: string): WaveformProgressLogEntry | null {
  const now = new Date().toISOString()
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const message = typeof parsed.message === 'string' ? parsed.message : raw
    const levelRaw = typeof parsed.level === 'string' ? parsed.level.toLowerCase() : 'info'
    const level: WaveformProgressLogEntry['level'] =
      levelRaw === 'error' ? 'error' : levelRaw === 'warn' || levelRaw === 'warning' ? 'warn' : 'info'

    return {
      timestamp: typeof parsed.timestamp === 'string' ? parsed.timestamp : now,
      level,
      message,
    }
  } catch {
    return {
      timestamp: now,
      level: 'info',
      message: raw,
    }
  }
}

function appendLogWithLimit(logs: WaveformProgressLogEntry[], entry: WaveformProgressLogEntry): WaveformProgressLogEntry[] {
  const next = [...logs, entry]
  if (next.length <= 800) return next
  return next.slice(next.length - 800)
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = globalThis.setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`))
    }, timeoutMs)

    promise
      .then((value) => {
        globalThis.clearTimeout(timer)
        resolve(value)
      })
      .catch((error) => {
        globalThis.clearTimeout(timer)
        reject(error)
      })
  })
}

function selectPreferredJobSolution(solutions: JobSolutionEntry[]): JobSolutionEntry | null {
  if (solutions.length === 0) return null

  const finalStage = solutions.find((solution) => solution.stage?.toLowerCase() === 'final_stage')
  if (finalStage) return finalStage

  const qualitySorted = [...solutions].sort((a, b) => (b.quality ?? -Infinity) - (a.quality ?? -Infinity))
  if ((qualitySorted[0]?.quality ?? -Infinity) > -Infinity) {
    return qualitySorted[0]
  }

  return solutions[solutions.length - 1]
}

function mergeBestSolution(
  existing: MomentTensorSolution | undefined,
  incoming: JobSolutionEntry,
  fallbackDepthKm: number
): MomentTensorSolution {
  const existingTensor = existing?.tensor
  const incomingTensor = incoming.tensor
  const nodalFromDirectSdr =
    incoming.s1 != null || incoming.d1 != null || incoming.r1 != null || incoming.s2 != null || incoming.d2 != null || incoming.r2 != null
      ? {
          nodalPlane1: {
            strike: { value: incoming.s1 ?? 0 },
            dip: { value: incoming.d1 ?? 0 },
            rake: { value: incoming.r1 ?? 0 },
          },
          nodalPlane2: {
            strike: { value: incoming.s2 ?? 0 },
            dip: { value: incoming.d2 ?? 0 },
            rake: { value: incoming.r2 ?? 0 },
          },
          preferredPlane: 1 as const,
        }
      : undefined

  const resolvedFitPercent =
    incoming.derived?.fit_percent ??
    (incoming.variance_reduction != null ? incoming.variance_reduction * 100 : undefined) ??
    existing?.derived?.fit_percent

  const resolvedStationsUsed =
    incoming.derived?.stations_used ??
    incoming.stations_used ??
    existing?.derived?.stations_used

  const resolvedAzimuthalGap =
    incoming.derived?.azimuthal_gap ??
    incoming.observation_gap ??
    existing?.derived?.azimuthal_gap

  const resolvedDerived =
    resolvedFitPercent != null ||
    incoming.derived?.avg_scale != null ||
    resolvedStationsUsed != null ||
    resolvedAzimuthalGap != null ||
    incoming.derived?.dc100 != null ||
    incoming.derived?.clvd100 != null ||
    existing?.derived
      ? {
          fit_percent: resolvedFitPercent,
          avg_scale: incoming.derived?.avg_scale ?? existing?.derived?.avg_scale,
          stations_used: resolvedStationsUsed,
          azimuthal_gap: resolvedAzimuthalGap,
          dc100: incoming.derived?.dc100 ?? existing?.derived?.dc100,
          clvd100: incoming.derived?.clvd100 ?? existing?.derived?.clvd100,
        }
      : undefined

  return {
    depth_km: incoming.depth_km ?? existing?.depth_km ?? fallbackDepthKm,
    latitude: incoming.latitude ?? existing?.latitude,
    longitude: incoming.longitude ?? existing?.longitude,
    variance_reduction: incoming.variance_reduction ?? existing?.variance_reduction ?? 0,
    dc_perc: incoming.dc_perc ?? existing?.dc_perc ?? 0,
    clvd_perc: incoming.clvd_perc ?? existing?.clvd_perc ?? 0,
    iso_perc: incoming.iso_perc ?? existing?.iso_perc ?? 0,
    scalar_moment: incoming.scalar_moment ?? existing?.scalar_moment ?? 0,
    magnitude_mw: incoming.magnitude_mw ?? existing?.magnitude_mw ?? 0,
    nodalPlanes: incoming.nodalPlanes ?? nodalFromDirectSdr ?? existing?.nodalPlanes,
    derived: resolvedDerived,
    moment_tensor: {
      m11: incoming.moment_tensor?.m11 ?? existing?.moment_tensor?.m11 ?? incomingTensor?.mrr ?? existingTensor?.mrr ?? 0,
      m22: incoming.moment_tensor?.m22 ?? existing?.moment_tensor?.m22 ?? incomingTensor?.mtt ?? existingTensor?.mtt ?? 0,
      m33: incoming.moment_tensor?.m33 ?? existing?.moment_tensor?.m33 ?? incomingTensor?.mpp ?? existingTensor?.mpp ?? 0,
      m12: incoming.moment_tensor?.m12 ?? existing?.moment_tensor?.m12 ?? incomingTensor?.mrt ?? existingTensor?.mrt ?? 0,
      m13: incoming.moment_tensor?.m13 ?? existing?.moment_tensor?.m13 ?? incomingTensor?.mrp ?? existingTensor?.mrp ?? 0,
      m23: incoming.moment_tensor?.m23 ?? existing?.moment_tensor?.m23 ?? incomingTensor?.mtp ?? existingTensor?.mtp ?? 0,
    },
    tensor: {
      mrr: incomingTensor?.mrr ?? existingTensor?.mrr ?? 0,
      mtt: incomingTensor?.mtt ?? existingTensor?.mtt ?? 0,
      mpp: incomingTensor?.mpp ?? existingTensor?.mpp ?? 0,
      mrt: incomingTensor?.mrt ?? existingTensor?.mrt ?? 0,
      mrp: incomingTensor?.mrp ?? existingTensor?.mrp ?? 0,
      mtp: incomingTensor?.mtp ?? existingTensor?.mtp ?? 0,
    },
  }
}

interface WaveformStore extends WaveformState {
  // Actions
  loadWaveforms: (jobId: string) => Promise<void>
  startProgressTracking: (jobId: string) => Promise<void>
  stopProgressTracking: () => void
  clearProgressLogs: () => void
  updateContext: (context: ProcessingContext) => void
  setNormalizationMode: (mode: NormalizationMode) => void
  setProcessingProfile: (profile: string) => void
  toggleStationSelection: (stationKey: string) => void
  updateStationWeight: (stationKey: string, weight: number) => Promise<void>
  updateStationTimeShift: (stationKey: string, shift: number) => Promise<void>
  setFrequencyFilter: (low: number, high: number) => void
  resetDownloadState: () => void
  reset: () => void
  // Table actions
  setSorting: (column: SortColumn) => void
  toggleDistanceGroupFilter: (group: DistanceGroup) => void
  selectAll: () => void
  deselectAll: () => void
  enableAll: () => void
  disableAll: () => void
  getFilteredStations: () => StationWaveformData[]
}

const initialState: WaveformState = {
  jobId: null,
  eventId: null,
  context: null,
  stations: [],
  selectedStationKeys: new Set(),
  normalizationMode: 'trace',
  processingProfile: 'QCMT_R',
  frequencyFilter: { low: 0.02, high: 0.08 },
  downloadState: {
    isDownloading: false,
    progress: 0,
    totalStations: 0,
    completedStations: 0,
    errors: [],
  },
  isLoading: false,
  error: null,
  isWaveformPrepReady: false,
  progressSnapshot: {
    stage: null,
    status: null,
    progress: 0,
    message: null,
    taskId: null,
    streamUrl: null,
    latestTaskStreamUrl: null,
    updatedAt: null,
  },
  progressLogs: [],
  isProgressTracking: false,
  progressConnection: 'idle',
  progressError: null,
  sortColumn: null,
  sortDirection: 'asc',
  distanceGroupFilter: new Set(['local', 'regional', 'teleseismic']),
}

export const useWaveformStore = create<WaveformStore>((set, get) => ({
  ...initialState,

  // Actions
  loadWaveforms: async (jobId: string) => {
    set({ isLoading: true, error: null, jobId })
    
    try {
      // Try to fetch from platform API (AutoMT backend)
      const { platform } = await import('@/lib/platform')
      const { isWaveformPrepDone } = await import('@/lib/platform')

      let readinessKnown = false
      try {
        const progress = await withTimeout(platform.getJobProgress(jobId), 8000, 'getJobProgress')
        const isReady = isWaveformPrepDone(progress.stage, progress.status)
        readinessKnown = true

        set((state) => ({
          isWaveformPrepReady: isReady,
          progressSnapshot: {
            stage: progress.stage,
            status: progress.status,
            progress: progress.progress,
            message: progress.message,
            taskId: progress.task_id,
            streamUrl: progress.stream_url,
            latestTaskStreamUrl: progress.latest_task_stream_url,
            updatedAt: progress.updated_at,
          },
          progressConnection: state.progressConnection === 'idle' ? 'polling' : state.progressConnection,
          progressError: null,
        }))

        if (!isReady) {
          set({ isLoading: false, stations: [], context: null })
          return
        }
      } catch (progressError) {
        set({ progressError: (progressError as Error).message })
      }
      
      try {
        let context = await withTimeout(platform.getJobContext(jobId), 10000, 'getJobContext')

        // Prefer final_solution from results endpoint for tensor values shown in waveform UI.
        let hasFinalSolutionFromResults = false
        try {
          const resultsResponse = await withTimeout(platform.getJobResults(jobId), 10000, 'getJobResults')
          if (resultsResponse.final_solution) {
            context = {
              ...context,
              best_solution: mergeBestSolution(
                context.best_solution,
                resultsResponse.final_solution,
                context.event.depth_km
              ),
            }
            hasFinalSolutionFromResults = true
          }
        } catch (resultsError) {
          console.warn('Failed to fetch job results, fallback to solutions endpoint:', resultsError)
        }

        // Pull inversion/depth-search solutions as fallback/extra enrichment.
        try {
          const solutionsResponse = await withTimeout(platform.getJobSolutions(jobId), 10000, 'getJobSolutions')
          const preferredSolution = selectPreferredJobSolution(solutionsResponse.solutions)
          if (preferredSolution) {
            if (hasFinalSolutionFromResults) {
              // /results can omit counts.selected_stations and observation_gap;
              // enrich only derived metadata from /solutions without replacing tensor solution.
              context = {
                ...context,
                best_solution: mergeBestSolution(
                  context.best_solution,
                  {
                    derived: preferredSolution.derived,
                    stations_used: preferredSolution.stations_used,
                    observation_gap: preferredSolution.observation_gap,
                  },
                  context.event.depth_km
                ),
              }
            } else {
              context = {
                ...context,
                best_solution: mergeBestSolution(
                  context.best_solution,
                  preferredSolution,
                  context.event.depth_km
                ),
              }
            }
          }
        } catch (solutionsError) {
          console.warn('Failed to fetch job solutions, continuing with context best_solution:', solutionsError)
        }
        
        // Map context data to StationWaveformData format
        const { getDistanceGroup } = await import('@/lib/waveform-colors')
        const stations: StationWaveformData[] = Object.entries(context.valid_waveforms).map(([key, metadata]) => {
          const isSelected = context.selected_stations.includes(key)
          const distanceGroup = getDistanceGroup(metadata.distance_deg)
          
          // Find contribution data if available
          const contribution: StationMTContribution = {
            waveformId: {
              networkCode: metadata.network,
              stationCode: metadata.station,
              locationCode: metadata.location,
              channelCode: metadata.channel,
            },
            component: distanceGroup === 'local' ? 'P' : 'R',
            active: isSelected,
            weight: metadata.Z?.weight || 0.8,
            timeShift: 0,
            misfit: 0.2,
            snr: metadata.Z?.snr || 10,
          }
          
          return {
            stationKey: key,
            metadata,
            contribution,
            distanceGroup,
            isSelected,
            isActive: isSelected,
          }
        })
        
        const selectedStationKeys = new Set(context.selected_stations)

        const stageUpper = context.current_stage?.toUpperCase()
        const isReadyFromContext =
          stageUpper === 'WAVEFORM_PREP_DONE' ||
          stageUpper === 'STATION_SELECTION_DONE' ||
          stageUpper === 'INVERTED' ||
          stageUpper === 'FINALIZED' ||
          stageUpper === 'OPTIMIZED' ||
          stageUpper === 'COMMITTED'
        
        set({ 
          context, 
          stations, 
          eventId: context.event_id,
          selectedStationKeys,
          isWaveformPrepReady: readinessKnown ? true : isReadyFromContext,
          isLoading: false 
        })
      } catch (apiError) {
        // Fallback to mock data if API fails
        console.warn('Platform API failed, using mock data:', apiError)
        const { mockProcessingContext, mockStationWaveforms } = await import('@/lib/mock/waveform-mock')
        
        const context = mockProcessingContext
        const stations = mockStationWaveforms()
        const selectedStationKeys = new Set(context.selected_stations)
        
        set({ 
          context, 
          stations, 
          eventId: context.event_id,
          selectedStationKeys,
          isWaveformPrepReady: true,
          isLoading: false 
        })
      }
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  startProgressTracking: async (jobId: string) => {
    closeProgressSources()
    set({ isProgressTracking: true, progressError: null, jobId, progressConnection: 'polling' })

    const refresh = async () => {
      try {
        const { platform, isWaveformPrepDone } = await import('@/lib/platform')
        const progress = await withTimeout(platform.getJobProgress(jobId), 8000, 'getJobProgress')
        const isReady = isWaveformPrepDone(progress.stage, progress.status)

        set((state) => ({
          isWaveformPrepReady: isReady,
          progressSnapshot: {
            stage: progress.stage,
            status: progress.status,
            progress: progress.progress,
            message: progress.message,
            taskId: progress.task_id,
            streamUrl: progress.stream_url,
            latestTaskStreamUrl: progress.latest_task_stream_url,
            updatedAt: progress.updated_at,
          },
          progressConnection: progressEventSource ? 'sse' : 'polling',
          progressError: null,
          progressLogs:
            progress.message && progress.message !== lastProgressMessage
              ? appendLogWithLimit(state.progressLogs, {
                  timestamp: progress.updated_at || new Date().toISOString(),
                  level: 'info',
                  message: progress.message,
                })
              : state.progressLogs,
        }))

        if (progress.message && progress.message !== lastProgressMessage) {
          lastProgressMessage = progress.message
        }

        if (isReady && !get().context && !get().isLoading) {
          await get().loadWaveforms(jobId)
        }

        const streamUrl =
          progress.latest_task_stream_url ||
          progress.stream_url ||
          (progress.task_id ? platform.getInteractiveTaskStreamLogsUrl(progress.task_id) : null)
        if (!progressEventSource && streamUrl) {
          progressEventSource = new EventSource(streamUrl)
          progressEventSource.onopen = () => {
            set({ progressConnection: 'sse' })
          }

          const onEventData = (raw: string) => {
            const entry = parseProgressLogEvent(raw)
            if (!entry) return
            set((state) => ({ progressLogs: appendLogWithLimit(state.progressLogs, entry) }))
          }

          progressEventSource.onmessage = (event) => onEventData(event.data)
          progressEventSource.addEventListener('log', (event) => {
            onEventData((event as MessageEvent).data)
          })
          progressEventSource.onerror = () => {
            if (progressEventSource) {
              progressEventSource.close()
              progressEventSource = null
            }
            set({ progressConnection: 'polling' })
          }
        }
      } catch (error) {
        set({
          progressError: (error as Error).message,
          progressConnection: progressEventSource ? 'sse' : 'polling',
        })
      }
    }

    await refresh()
    progressPollTimer = globalThis.setInterval(() => {
      void refresh()
    }, 2000)
  },

  stopProgressTracking: () => {
    closeProgressSources()
    set({ isProgressTracking: false, progressConnection: 'idle' })
  },

  clearProgressLogs: () => {
    set({ progressLogs: [] })
  },

  updateContext: (context) => set({ context }),

  setNormalizationMode: (mode) => set({ normalizationMode: mode }),

  setProcessingProfile: (profile) => set({ processingProfile: profile }),

  toggleStationSelection: (stationKey) => {
    const { selectedStationKeys } = get()
    const newSet = new Set(selectedStationKeys)
    
    if (newSet.has(stationKey)) {
      newSet.delete(stationKey)
    } else {
      newSet.add(stationKey)
    }
    
    // Update isSelected flag in stations
    const stations = get().stations.map(s =>
      s.stationKey === stationKey
        ? { ...s, isSelected: newSet.has(stationKey) }
        : s
    )
    
    set({ selectedStationKeys: newSet, stations })
  },

  updateStationWeight: async (stationKey, weight) => {
    const { jobId, stations } = get()
    if (!jobId) return

    // Optimistic update
    const updatedStations = stations.map(s =>
      s.stationKey === stationKey
        ? { ...s, contribution: { ...s.contribution, weight } }
        : s
    )
    set({ stations: updatedStations })

    // Persist to backend
    try {
      const { platform } = await import('@/lib/platform')
      await platform.updateStationWeights(jobId, { [stationKey]: weight })
    } catch (error) {
      console.error('Failed to update station weight:', error)
      // Revert on error
      set({ stations, error: (error as Error).message })
    }
  },

  updateStationTimeShift: async (stationKey, shift) => {
    const { jobId, stations } = get()
    if (!jobId) return

    // Optimistic update
    const updatedStations = stations.map(s =>
      s.stationKey === stationKey
        ? { ...s, contribution: { ...s.contribution, timeShift: shift } }
        : s
    )
    set({ stations: updatedStations })

    // TODO: Add backend endpoint for time shift updates
    // Currently not available in AutoMT API v2.5.0
  },

  setFrequencyFilter: async (low, high) => {
    const { jobId } = get()
    set({ frequencyFilter: { low, high } })
    
    if (!jobId) return
    
    // Trigger re-inversion with new filter
    try {
      const { platform } = await import('@/lib/platform')
      const newSolution = await platform.updateFrequencyFilter(jobId, low, high)
      
      // Update context with new solution
      set((state) => ({
        context: state.context
          ? { ...state.context, best_solution: newSolution }
          : null,
      }))
    } catch (error) {
      console.error('Failed to update frequency filter:', error)
      set({ error: (error as Error).message })
    }
  },

  resetDownloadState: () =>
    set({
      downloadState: {
        isDownloading: false,
        progress: 0,
        totalStations: 0,
        completedStations: 0,
        errors: [],
      },
    }),

  // Table actions
  setSorting: (column) => {
    const { sortColumn, sortDirection } = get()
    
    if (sortColumn === column) {
      // Toggle direction if same column
      set({ sortDirection: sortDirection === 'asc' ? 'desc' : 'asc' })
    } else {
      // New column, default to ascending
      set({ sortColumn: column, sortDirection: 'asc' })
    }
  },

  toggleDistanceGroupFilter: (group) => {
    const { distanceGroupFilter } = get()
    const newFilter = new Set(distanceGroupFilter)
    
    if (newFilter.has(group)) {
      newFilter.delete(group)
    } else {
      newFilter.add(group)
    }
    
    set({ distanceGroupFilter: newFilter })
  },

  selectAll: () => {
    const { stations } = get()
    const allKeys = new Set(stations.map(s => s.stationKey))
    set({ selectedStationKeys: allKeys })
  },

  deselectAll: () => {
    set({ selectedStationKeys: new Set() })
  },

  enableAll: () => {
    const { stations } = get()
    const updatedStations = stations.map(s => ({
      ...s,
      contribution: { ...s.contribution, active: true },
      isActive: true,
    }))
    set({ stations: updatedStations })
  },

  disableAll: () => {
    const { stations } = get()
    const updatedStations = stations.map(s => ({
      ...s,
      contribution: { ...s.contribution, active: false },
      isActive: false,
    }))
    set({ stations: updatedStations })
  },

  getFilteredStations: () => {
    const { stations, sortColumn, sortDirection, distanceGroupFilter } = get()
    
    // Filter by distance group
    let filtered = stations.filter(s => distanceGroupFilter.has(s.distanceGroup))
    
    // Sort
    if (sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        let aVal: number | string = 0
        let bVal: number | string = 0
        
        switch (sortColumn) {
          case 'distance':
            aVal = a.metadata.distance_deg
            bVal = b.metadata.distance_deg
            break
          case 'azimuth':
            aVal = a.metadata.azimuth_deg
            bVal = b.metadata.azimuth_deg
            break
          case 'fit':
            aVal = a.contribution.misfit ? (1 - a.contribution.misfit) * 100 : 0
            bVal = b.contribution.misfit ? (1 - b.contribution.misfit) * 100 : 0
            break
          case 'snr':
            aVal = a.contribution.snr || 0
            bVal = b.contribution.snr || 0
            break
          case 'weight':
            aVal = a.contribution.weight || 0
            bVal = b.contribution.weight || 0
            break
          case 'network':
            aVal = a.metadata.network
            bVal = b.metadata.network
            break
          case 'station':
            aVal = a.metadata.station
            bVal = b.metadata.station
            break
        }
        
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortDirection === 'asc' 
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal)
        }
        
        // Cast to number for arithmetic operations
        const aNum = aVal as number
        const bNum = bVal as number
        return sortDirection === 'asc' ? aNum - bNum : bNum - aNum
      })
    }
    
    return filtered
  },

  reset: () => {
    closeProgressSources()
    lastProgressMessage = ''
    set(initialState)
  },
}))
