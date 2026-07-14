/**
 * AutoMT API Client
 * 
 * Comprehensive TypeScript wrapper for AutoMT API v2.5.0
 * Base URL: http://10.20.229.39:8111
 * 
 * @module automt-client
 */

import { useSettingsStore } from '@/stores/settingsStore'
import {
  createMockJob,
  getMockJob,
  getMockJobProgress,
  deleteMockJob,
  runMockStage,
  pollMockTask,
  getMockStations,
  getMockWaveforms,
  getMockSolutions,
  getMockCheckpoints,
  getMockPatchHistory,
  restoreMockCheckpoint,
} from '@/lib/mock/job-mock'

// ─── Type Definitions ─────────────────────────────────────────────────────────

/** Job status values */
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

/** Processing stage names */
export type ProcessingStage = 
  | 'station-prep' 
  | 'waveform-prep' 
  | 'station-selection' 
  | 'inversion' 
  | 'finalize'

/** Waveform data kind for GET /waveforms */
export type WaveformKind = 
  | 'normal' 
  | 'cholesky' 
  | 'plot_obs' 
  | 'plot_syn' 
  | 'plot_obs_c' 
  | 'plot_syn_c'

// ─── API Request/Response Schemas ─────────────────────────────────────────────

export interface EventSummarySchema {
  event_id: string
  origin_time: string
  latitude: number
  longitude: number
  depth_km: number
  magnitude: number
  magnitude_type: string
  phases?: number
  rms?: number
  evaluation_status?: string
  focal_mechanism_count?: number
  focal_mechanism_quality?: string
  agency_id?: string
  region?: string
}

export interface PaginatedEvents {
  events: EventSummarySchema[]
  total_count: number
  page: number
  page_size: number
}

export interface InteractiveJobInitRequest {
  event_id: string
  lat: number
  lon: number
  mag: number
  depth: number
  time: string
  waveform_source_type?: 'fdsn' | 'arclink' | 'seedlink' | 'file'
  auto_gf?: boolean
  is_deviatoric?: boolean
  data_is_corrected?: boolean
  target_method?: string
  override_fband?: [number, number]
  centroid_inversion?: boolean
}

export interface InteractiveJobResponse {
  job_id: string
  event_id: string
  fingerprint: string
  is_new: boolean
  current_stage: ProcessingStage | null
  pending_stages: ProcessingStage[]
  stage_completed_at?: string
  duration_s?: number
  job_dir: string
}

export interface AsyncStepResponse {
  job_id: string
  task_id: string
  poll_url: string
  stream_url: string
  status: 'accepted' | 'running'
}

export interface StageProgress {
  stage: ProcessingStage
  status: JobStatus
  completed_at?: string
  duration_s?: number
}

export interface JobProgressResponse {
  job_id: string
  event_id: string
  stages: StageProgress[]
  current_stage: ProcessingStage | null
  next_step_url?: string
}

export interface StationInfo {
  station_id: string
  network: string
  code: string
  location_code?: string
  band_code?: string
  weights: {
    Z?: number
    R?: number
    T?: number
  }
  geometry?: Record<string, unknown>
  has_valid_waveform: boolean
  status: string
  distance_deg?: number
  azimuth_deg?: number
}

export interface InversionRequest {
  is_automatic?: boolean
  est_uncertainty?: boolean
  use_optimization?: boolean
  force_optimization?: boolean
  NS_ranges_km?: [number, number, number][]
  EW_ranges_km?: [number, number, number][]
  Dep_ranges_km?: [number, number, number][]
  centroid_inv?: boolean
  lock_depth_ref?: boolean
}

export interface StationSelectionRequest {
  use_all_stations?: boolean
  num_sector?: number
  num_station_per_sector?: number
}

export interface PatchStationsRequest {
  selected_station_ids?: string[]
  default_weights?: {
    Z?: number
    R?: number
    T?: number
  }
}

export interface PatchFrequencyRequest {
  fmin?: number
  fmax?: number
}

export interface PatchDistanceBoundsRequest {
  min_dist?: number
  max_dist?: number
}

export interface ManualTimeShiftRequest {
  time_shift_s: number
}

export interface GuiWaveformDataResponse {
  job_id: string
  kind: WaveformKind
  station_id?: string
  include_time: boolean
  count: number
  data: Record<string, {
    plot_t?: number[]
    plot_obs?: number[]
    plot_syn?: number[]
    plot_obs_c?: number[]
    plot_syn_c?: number[]
  }>
}

export interface CentroidSolution {
  stage: ProcessingStage
  latitude?: number
  longitude?: number
  depth_km?: number
  time?: string
  moment_tensor?: {
    mrr?: number
    mtt?: number
    mpp?: number
    mrt?: number
    mrp?: number
    mtp?: number
    scalar_moment?: number
  }
  nodal_planes?: Array<{
    strike?: number
    dip?: number
    rake?: number
  }>
  variance_reduction?: number
  dc_perc?: number
  clvd_perc?: number
  iso_perc?: number
  misfit?: number
}

export interface JobResultResponse {
  job_id: string
  final_stage: ProcessingStage
  final_solution: CentroidSolution
  plots: string[]
  download_url: string
}

export interface PatchHistoryEntry {
  timestamp: string
  patch_type: string
  old_value: unknown
  new_value: unknown
  author?: string
}

export interface PatchHistoryResponse {
  job_id: string
  patches: PatchHistoryEntry[]
}

export interface Checkpoint {
  checkpoint_id: string
  stage: ProcessingStage
  timestamp: string
  description?: string
}

export interface ProcessorJobRequest {
  event_id: string
  lat: number
  lon: number
  mag: number
  depth: number
  time: string
  workdir?: string
  processor_timeout?: number
  db_url?: string
}

export interface ProcessorJobStatus {
  job_id: string
  event_id: string
  status: JobStatus
  submitted_at: string
  started_at?: string
  finished_at?: string
  exit_code?: number
  log?: string
  log_size?: number
}

export interface TaskStatusResponse {
  task_id: string
  status: JobStatus
  progress?: number
  message?: string
  result?: unknown
  error?: string
}

// ─── API Client Class ─────────────────────────────────────────────────────────

export class AutoMTAPIClient {
  private baseUrl: string
  private useMockMode: boolean = false

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || this.getDefaultBaseUrl()
  }

  private getDefaultBaseUrl(): string {
    const settings = useSettingsStore.getState()
    return settings?.settings?.server?.autoMtApiUrl || 'http://10.20.229.39:8111'
  }

  enableMockMode(): void {
    this.useMockMode = true
    console.log('🎭 AutoMT Client: Mock mode enabled')
  }

  disableMockMode(): void {
    this.useMockMode = false
    console.log('🌐 AutoMT Client: Mock mode disabled')
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit,
    queryParams?: Record<string, string | number | boolean | undefined>
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`)
    
    // Add query parameters
    if (queryParams) {
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, String(value))
        }
      })
    }

    const response = await fetch(url.toString(), {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`AutoMT API Error ${response.status}: ${errorText}`)
    }

    return response.json()
  }

  // ─── Events ───────────────────────────────────────────────────────────────

  /**
   * List all events with AutoMT results (paginated)
   */
  async listEvents(params?: {
    page?: number
    page_size?: number
    method_id?: string
    focal_mechanism_quality?: string
  }): Promise<PaginatedEvents> {
    return this.request<PaginatedEvents>('/automt/v1/events', undefined, params)
  }

  /**
   * Get preferred AutoMT result for a specific event
   */
  async getEventById(eventId: string): Promise<EventSummarySchema> {
    return this.request<EventSummarySchema>(`/automt/v1/events/${eventId}`)
  }

  /**
   * List all AutoMT results for an event
   */
  async getEventResults(eventId: string, params?: {
    page?: number
    page_size?: number
  }): Promise<PaginatedEvents> {
    return this.request<PaginatedEvents>(
      `/automt/v1/events/${eventId}/results`,
      undefined,
      params
    )
  }

  // ─── Interactive Processor ────────────────────────────────────────────────

  /**
   * Initialize or resume an interactive processing job
   */
  async createInteractiveJob(
    request: InteractiveJobInitRequest,
    options?: { callback_url?: string; dry_run?: boolean; debug?: boolean }
  ): Promise<AsyncStepResponse> {
    if (this.useMockMode) {
      console.log('🎭 Mock: Creating interactive job')
      return createMockJob(request)
    }
    
    try {
      return await this.request<AsyncStepResponse>(
        '/automt/v1/interactive-processor/jobs',
        {
          method: 'POST',
          body: JSON.stringify(request),
        },
        options
      )
    } catch (error) {
      console.warn('API unavailable, falling back to mock mode:', error)
      this.enableMockMode()
      return createMockJob(request)
    }
  }

  /**
   * List all interactive jobs
   */
  async listInteractiveJobs(params?: {
    page?: number
    page_size?: number
    status?: JobStatus
    event_id?: string
  }): Promise<{ jobs: InteractiveJobResponse[]; total_count: number }> {
    return this.request('/automt/v1/interactive-processor/jobs', undefined, params)
  }

  /**
   * Get job metadata
   */
  async getJob(jobId: string): Promise<InteractiveJobResponse> {
    if (this.useMockMode) {
      const job = getMockJob(jobId)
      if (!job) throw new Error(`Job not found: ${jobId}`)
      return job
    }
    return this.request<InteractiveJobResponse>(
      `/automt/v1/interactive-processor/jobs/${jobId}`
    )
  }

  /**
   * Delete job (soft delete)
   */
  async deleteJob(jobId: string): Promise<void> {
    if (this.useMockMode) {
      deleteMockJob(jobId)
      return
    }
    await this.request(`/automt/v1/interactive-processor/jobs/${jobId}`, {
      method: 'DELETE',
    })
  }

  /**
   * Get job stage progress
   */
  async getJobProgress(jobId: string): Promise<JobProgressResponse> {
    if (this.useMockMode) {
      return getMockJobProgress(jobId)
    }
    return this.request<JobProgressResponse>(
      `/automt/v1/interactive-processor/jobs/${jobId}/progress`
    )
  }

  /**
   * Get job context (metadata + registry + ProcessingContext)
   */
  async getJobContext(jobId: string): Promise<unknown> {
    return this.request(`/automt/v1/interactive-processor/jobs/${jobId}/context`)
  }

  // ─── Processing Stages ────────────────────────────────────────────────────

  /**
   * Run Stage 1: Station Preparation
   */
  async runStationPrep(
    jobId: string,
    options?: { callback_url?: string; dry_run?: boolean; debug?: boolean }
  ): Promise<AsyncStepResponse> {
    if (this.useMockMode) {
      return runMockStage(jobId, 'station-prep')
    }
    return this.request<AsyncStepResponse>(
      `/automt/v1/interactive-processor/jobs/${jobId}/station-prep`,
      { method: 'POST' },
      options
    )
  }

  /**
   * Run Stage 2: Waveform Preparation
   */
  async runWaveformPrep(
    jobId: string,
    options?: { callback_url?: string; dry_run?: boolean; debug?: boolean }
  ): Promise<AsyncStepResponse> {
    if (this.useMockMode) {
      return runMockStage(jobId, 'waveform-prep')
    }
    return this.request<AsyncStepResponse>(
      `/automt/v1/interactive-processor/jobs/${jobId}/waveform-prep`,
      { method: 'POST' },
      options
    )
  }

  /**
   * Run Stage 3: Station Selection
   */
  async runStationSelection(
    jobId: string,
    request: StationSelectionRequest,
    options?: { callback_url?: string; dry_run?: boolean; debug?: boolean }
  ): Promise<AsyncStepResponse> {
    if (this.useMockMode) {
      return runMockStage(jobId, 'station-selection')
    }
    return this.request<AsyncStepResponse>(
      `/automt/v1/interactive-processor/jobs/${jobId}/station-selection`,
      {
        method: 'POST',
        body: JSON.stringify(request),
      },
      options
    )
  }

  /**
   * Run Stage 4: Inversion
   */
  async runInversion(
    jobId: string,
    request: InversionRequest,
    options?: { callback_url?: string; dry_run?: boolean; debug?: boolean }
  ): Promise<AsyncStepResponse> {    if (this.useMockMode) {
      return runMockStage(jobId, 'inversion')
    }    return this.request<AsyncStepResponse>(
      `/automt/v1/interactive-processor/jobs/${jobId}/inversion`,
      {
        method: 'POST',
        body: JSON.stringify(request),
      },
      options
    )
  }

  /**
   * Run Stage 5: Finalize
   */
  async runFinalize(
    jobId: string,
    options?: { callback_url?: string; dry_run?: boolean; debug?: boolean }
  ): Promise<AsyncStepResponse> {
    if (this.useMockMode) {
      return runMockStage(jobId, 'finalize')
    }
    return this.request<AsyncStepResponse>(
      `/automt/v1/interactive-processor/jobs/${jobId}/finalize`,
      { method: 'POST' },
      options
    )
  }

  // ─── Stations ─────────────────────────────────────────────────────────────

  /**
   * Get all candidate stations for a job
   */
  async getJobStations(jobId: string): Promise<StationInfo[]> {
    if (this.useMockMode) {
      return getMockStations(jobId)
    }
    return this.request<StationInfo[]>(
      `/automt/v1/interactive-processor/jobs/${jobId}/stations`
    )
  }

  /**
   * Replace manual station selection or apply default weights
   */
  async patchStations(jobId: string, request: PatchStationsRequest): Promise<void> {
    await this.request(
      `/automt/v1/interactive-processor/jobs/${jobId}/stations`,
      {
        method: 'PATCH',
        body: JSON.stringify(request),
      }
    )
  }

  /**
   * Toggle single station in/out of inversion
   */
  async toggleStationSelection(jobId: string, stationId: string): Promise<void> {
    await this.request(
      `/automt/v1/interactive-processor/jobs/${jobId}/stations/${stationId}/selection`,
      { method: 'PATCH' }
    )
  }

  /**
   * Apply manual station waveform time shift
   */
  async applyStationTimeShift(
    jobId: string,
    stationId: string,
    request: ManualTimeShiftRequest
  ): Promise<void> {
    await this.request(
      `/automt/v1/interactive-processor/jobs/${jobId}/stations/${stationId}/time-shift`,
      {
        method: 'PATCH',
        body: JSON.stringify(request),
      }
    )
  }

  // ─── Waveforms ────────────────────────────────────────────────────────────

  /**
   * Get GUI waveform arrays (observed/synthetic)
   */
  async getJobWaveforms(
    jobId: string,
    params?: {
      kind?: WaveformKind
      station_id?: string
      include_time?: boolean
    }
  ): Promise<GuiWaveformDataResponse> {
    if (this.useMockMode) {
      return getMockWaveforms(jobId)
    }
    return this.request<GuiWaveformDataResponse>(
      `/automt/v1/interactive-processor/jobs/${jobId}/waveforms`,
      undefined,
      { kind: 'cholesky', include_time: true, ...params }
    )
  }

  // ─── Solutions & Results ──────────────────────────────────────────────────

  /**
   * Get CentroidSolution objects for all inversion stages
   */
  async getJobSolutions(
    jobId: string,
    params?: { stage?: ProcessingStage | 'all' }
  ): Promise<CentroidSolution[]> {
    if (this.useMockMode) {
      return getMockSolutions(jobId)
    }
    return this.request<CentroidSolution[]>(
      `/automt/v1/interactive-processor/jobs/${jobId}/solutions`,
      undefined,
      params
    )
  }

  /**
   * Get job results
   */
  async getJobResults(jobId: string): Promise<JobResultResponse> {
    return this.request<JobResultResponse>(
      `/automt/v1/interactive-processor/jobs/${jobId}/results`
    )
  }

  /**
   * Download a job result file (returns Blob)
   */
  async downloadJobResultFile(jobId: string, filename: string): Promise<Blob> {
    const url = `${this.baseUrl}/automt/v1/interactive-processor/jobs/${jobId}/results/${filename}`
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`)
    }
    return response.blob()
  }

  // ─── Parameter Patching ───────────────────────────────────────────────────

  /**
   * Adjust fitting frequency bounds
   */
  async patchFrequency(jobId: string, request: PatchFrequencyRequest): Promise<void> {
    await this.request(
      `/automt/v1/interactive-processor/jobs/${jobId}/frequency`,
      {
        method: 'PATCH',
        body: JSON.stringify(request),
      }
    )
  }

  /**
   * Adjust station distance bounds
   */
  async patchDistanceBounds(
    jobId: string,
    request: PatchDistanceBoundsRequest
  ): Promise<void> {
    await this.request(
      `/automt/v1/interactive-processor/jobs/${jobId}/distance-bounds`,
      {
        method: 'PATCH',
        body: JSON.stringify(request),
      }
    )
  }

  // ─── Checkpoints ──────────────────────────────────────────────────────────

  /**
   * List saved context checkpoints
   */
  async listCheckpoints(jobId: string): Promise<Checkpoint[]> {
    if (this.useMockMode) {
      return getMockCheckpoints(jobId)
    }
    return this.request<Checkpoint[]>(
      `/automt/v1/interactive-processor/jobs/${jobId}/checkpoints`
    )
  }

  /**
   * Restore a checkpoint
   */
  async restoreCheckpoint(jobId: string, checkpointId: string): Promise<void> {
    if (this.useMockMode) {
      restoreMockCheckpoint(jobId, checkpointId)
      return
    }
    await this.request(
      `/automt/v1/interactive-processor/jobs/${jobId}/checkpoints/${checkpointId}/restore`,
      { method: 'POST' }
    )
  }

  // ─── Patch History ────────────────────────────────────────────────────────

  /**
   * Get patch history (audit trail of manual edits)
   */
  async getPatchHistory(jobId: string): Promise<PatchHistoryResponse> {
    if (this.useMockMode) {
      return getMockPatchHistory(jobId)
    }
    return this.request<PatchHistoryResponse>(
      `/automt/v1/interactive-processor/jobs/${jobId}/patch-history`
    )
  }

  // ─── Task Polling ─────────────────────────────────────────────────────────

  /**
   * Poll async task status
   */
  async pollTaskStatus(taskId: string): Promise<TaskStatusResponse> {
    if (this.useMockMode) {
      return pollMockTask(taskId) as TaskStatusResponse
    }
    return this.request<TaskStatusResponse>(
      `/automt/v1/interactive-processor/tasks/${taskId}`
    )
  }

  /**
   * Cancel a running async task
   */
  async cancelTask(taskId: string): Promise<void> {
    await this.request(`/automt/v1/interactive-processor/tasks/${taskId}`, {
      method: 'DELETE',
    })
  }

  /**
   * Get SSE stream URL for task logs
   */
  getTaskLogStreamUrl(taskId: string): string {
    return `${this.baseUrl}/automt/v1/interactive-processor/tasks/${taskId}/streamlogs`
  }

  /**
   * Get SSE stream URL for task results
   */
  getTaskResultStreamUrl(taskId: string): string {
    return `${this.baseUrl}/automt/v1/interactive-processor/tasks/${taskId}/streamresults`
  }

  // ─── Auto-Processor ───────────────────────────────────────────────────────

  /**
   * Submit fully automated processing job
   */
  async submitAutoProcessorJob(
    request: ProcessorJobRequest
  ): Promise<{ job_id: string }> {
    return this.request<{ job_id: string }>(
      '/automt/v1/auto-processor/jobs',
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    )
  }

  /**
   * List all auto-processor jobs
   */
  async listAutoProcessorJobs(params?: {
    page?: number
    page_size?: number
    status?: JobStatus
    event_id?: string
  }): Promise<{ jobs: ProcessorJobStatus[]; total_count: number }> {
    return this.request('/automt/v1/auto-processor/jobs', undefined, params)
  }

  /**
   * Get auto-processor job status
   */
  async getAutoProcessorJob(jobId: string): Promise<ProcessorJobStatus> {
    return this.request<ProcessorJobStatus>(
      `/automt/v1/auto-processor/jobs/${jobId}`
    )
  }

  /**
   * Cancel auto-processor job
   */
  async cancelAutoProcessorJob(jobId: string): Promise<void> {
    await this.request(`/automt/v1/auto-processor/jobs/${jobId}`, {
      method: 'DELETE',
    })
  }

  /**
   * Get SSE stream URL for auto-processor job logs
   */
  getAutoProcessorLogStreamUrl(jobId: string): string {
    return `${this.baseUrl}/automt/v1/auto-processor/jobs/${jobId}/streamlogs`
  }

  // ─── Health ───────────────────────────────────────────────────────────────

  /**
   * Health check endpoint
   */
  async healthCheck(): Promise<{ status: string; version?: string }> {
    return this.request<{ status: string; version?: string }>('/')
  }
}

// ─── Default Client Instance ──────────────────────────────────────────────────

let defaultClient: AutoMTAPIClient | null = null

/**
 * Get the default AutoMT API client instance (singleton)
 */
export function getAutoMTClient(): AutoMTAPIClient {
  if (!defaultClient) {
    defaultClient = new AutoMTAPIClient()
  }
  return defaultClient
}

/**
 * Reset the default client (useful for testing or changing base URL)
 */
export function resetAutoMTClient(baseUrl?: string): void {
  defaultClient = new AutoMTAPIClient(baseUrl)
}
