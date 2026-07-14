import type {
  InteractiveJobInitRequest,
  InteractiveJobResponse,
  AsyncStepResponse,
  JobProgressResponse,
  StationInfo,
  GuiWaveformDataResponse,
  CentroidSolution,
  JobResultResponse,
  Checkpoint,
  PatchHistoryResponse,
} from '@/lib/api/automt-client'

// Mock job storage
const mockJobs = new Map<string, InteractiveJobResponse>()
const mockTasks = new Map<string, { status: string; progress: number; message?: string }>()

let jobCounter = 1
let taskCounter = 1

export function createMockJob(request: InteractiveJobInitRequest): AsyncStepResponse {
  const jobId = `mock-job-${jobCounter++}`
  const taskId = `mock-task-${taskCounter++}`
  
  const mockJob: InteractiveJobResponse = {
    job_id: jobId,
    event_id: request.event_id,
    event_summary: request.event_summary,
    current_stage: null,
    pending_stages: ['station-prep', 'waveform-prep', 'station-selection', 'inversion', 'finalize'],
    config: {
      waveform_source: request.waveform_source || 'FDSN',
      inversion_method: request.inversion_method || 'QCMT_R',
      auto_greens_functions: request.auto_greens_functions ?? true,
      deviatoric: request.deviatoric ?? true,
      centroid_inversion: request.centroid_inversion ?? true,
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  
  mockJobs.set(jobId, mockJob)
  mockTasks.set(taskId, { status: 'pending', progress: 0 })
  
  return {
    job_id: jobId,
    task_id: taskId,
    poll_url: `/mock/tasks/${taskId}`,
    message: 'Mock job created successfully',
  }
}

export function getMockJob(jobId: string): InteractiveJobResponse | undefined {
  return mockJobs.get(jobId)
}

export function getMockJobProgress(jobId: string): JobProgressResponse {
  const job = mockJobs.get(jobId)
  if (!job) {
    throw new Error(`Job not found: ${jobId}`)
  }
  
  return {
    job_id: jobId,
    current_stage: job.current_stage,
    pending_stages: job.pending_stages,
    stage_progress: [],
  }
}

export function deleteMockJob(jobId: string): void {
  mockJobs.delete(jobId)
}

export function runMockStage(jobId: string, stage: string): AsyncStepResponse {
  const taskId = `mock-task-${taskCounter++}`
  const job = mockJobs.get(jobId)
  
  if (!job) {
    throw new Error(`Job not found: ${jobId}`)
  }
  
  job.current_stage = stage as any
  job.updated_at = new Date().toISOString()
  
  mockTasks.set(taskId, { status: 'running', progress: 0 })
  
  // Simulate async completion
  setTimeout(() => {
    const task = mockTasks.get(taskId)
    if (task) {
      task.status = 'completed'
      task.progress = 100
      task.message = `${stage} completed successfully`
    }
  }, 3000) // Complete after 3 seconds
  
  return {
    job_id: jobId,
    task_id: taskId,
    poll_url: `/mock/tasks/${taskId}`,
    message: `${stage} started`,
  }
}

export function pollMockTask(taskId: string): { status: string; progress?: number; message?: string; error?: string } {
  const task = mockTasks.get(taskId)
  if (!task) {
    return { status: 'unknown', error: 'Task not found' }
  }
  
  return {
    status: task.status,
    progress: task.progress,
    message: task.message,
  }
}

export function getMockStations(jobId: string): StationInfo[] {
  return [
    {
      station_id: 'IA.BNDI',
      network: 'IA',
      station: 'BNDI',
      channel: 'BHZ',
      location: '',
      latitude: -6.166,
      longitude: 106.832,
      elevation: 135,
      distance_km: 234.5,
      azimuth: 145.2,
      selected: true,
      theoretical_p_arrival: '2024-01-15T03:23:45Z',
      theoretical_s_arrival: '2024-01-15T03:24:12Z',
    },
    {
      station_id: 'GE.PLAI',
      network: 'GE',
      station: 'PLAI',
      channel: 'BHZ',
      location: '',
      latitude: 6.699,
      longitude: 101.079,
      elevation: 445,
      distance_km: 456.8,
      azimuth: 298.4,
      selected: true,
      theoretical_p_arrival: '2024-01-15T03:24:02Z',
      theoretical_s_arrival: '2024-01-15T03:24:45Z',
    },
    {
      station_id: 'IA.DBNI',
      network: 'IA',
      station: 'DBNI',
      channel: 'BHZ',
      location: '',
      latitude: -8.542,
      longitude: 118.968,
      elevation: 300,
      distance_km: 567.3,
      azimuth: 89.1,
      selected: false,
      theoretical_p_arrival: '2024-01-15T03:24:15Z',
      theoretical_s_arrival: '2024-01-15T03:25:05Z',
    },
  ]
}

export function getMockWaveforms(jobId: string): GuiWaveformDataResponse {
  const generateTrace = (length: number, freq: number) => {
    const data: number[] = []
    for (let i = 0; i < length; i++) {
      const t = i / length
      data.push(Math.exp(-t * 3) * Math.sin(2 * Math.PI * freq * t + Math.random() * 0.5))
    }
    return data
  }
  
  return [
    {
      station_code: 'BNDI',
      network: 'IA',
      channel: 'BHZ',
      distance: 234.5,
      azimuth: 145.2,
      observed: generateTrace(500, 3),
      synthetic: generateTrace(500, 3.2),
      fit_quality: 87.3,
      time_shift: 0.5,
      weight: 1.0,
    },
    {
      station_code: 'PLAI',
      network: 'GE',
      channel: 'BHZ',
      distance: 456.8,
      azimuth: 298.4,
      observed: generateTrace(500, 2.5),
      synthetic: generateTrace(500, 2.6),
      fit_quality: 92.1,
      time_shift: -0.3,
      weight: 1.0,
    },
    {
      station_code: 'DBNI',
      network: 'IA',
      channel: 'BHZ',
      distance: 567.3,
      azimuth: 89.1,
      observed: generateTrace(500, 2),
      synthetic: generateTrace(500, 2.1),
      fit_quality: 78.5,
      time_shift: 0.2,
      weight: 0.8,
    },
  ]
}

export function getMockSolutions(jobId: string): CentroidSolution[] {
  return [
    {
      solution_id: 'sol-1',
      stage: 'inversion',
      magnitude: 5.8,
      moment: 7.24e17,
      variance_reduction: 91.2,
      quality_label: 'A',
      nodal_planes: {
        plane1: {
          strike: 195,
          dip: 60,
          rake: -85,
        },
        plane2: {
          strike: 15,
          dip: 31,
          rake: -100,
        },
      },
      moment_tensor: {
        mrr: 3.2e17,
        mtt: -2.1e17,
        mpp: -1.1e17,
        mrt: 4.5e17,
        mrp: -2.3e17,
        mtp: 1.8e17,
      },
      centroid: {
        time: '2024-01-15T03:22:14Z',
        latitude: -8.415,
        longitude: 115.237,
        depth_km: 12.5,
      },
      created_at: new Date().toISOString(),
    },
  ]
}

export function getMockCheckpoints(jobId: string): Checkpoint[] {
  return [
    {
      checkpoint_id: 'cp-1',
      job_id: jobId,
      stage: 'station-selection',
      description: 'After selecting 15 stations',
      created_at: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      checkpoint_id: 'cp-2',
      job_id: jobId,
      stage: 'waveform-prep',
      description: 'After waveform download completed',
      created_at: new Date(Date.now() - 1800000).toISOString(),
    },
  ]
}

export function getMockPatchHistory(jobId: string): PatchHistoryResponse {
  return [
    {
      parameter_name: 'frequency_range',
      old_value: { fmin: 0.01, fmax: 0.1 },
      new_value: { fmin: 0.02, fmax: 0.08 },
      stage: 'inversion',
      timestamp: new Date(Date.now() - 900000).toISOString(),
      description: 'Adjusted frequency range for better fit',
    },
    {
      parameter_name: 'distance_bounds',
      old_value: { min_dist: 0, max_dist: 2000 },
      new_value: { min_dist: 100, max_dist: 1500 },
      stage: 'waveform-prep',
      timestamp: new Date(Date.now() - 1200000).toISOString(),
      description: 'Narrowed distance range',
    },
  ]
}

export function restoreMockCheckpoint(jobId: string, checkpointId: string): void {
  const job = mockJobs.get(jobId)
  if (!job) {
    throw new Error(`Job not found: ${jobId}`)
  }
  
  // Simulate checkpoint restore
  console.log(`Restoring checkpoint ${checkpointId} for job ${jobId}`)
}
