import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  ProcessingStage,
  JobStatus,
  InteractiveJobResponse,
  StageProgress,
} from '@/lib/api/automt-client'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BulletinLogEntry {
  id: string
  timestamp: Date
  level: 'info' | 'warn' | 'error' | 'success'
  message: string
  source?: 'system' | 'api' | 'user'
}

export interface ProcessingTask {
  taskId: string
  stage: ProcessingStage
  status: JobStatus
  pollUrl?: string
  streamUrl?: string
  startedAt: Date
  completedAt?: Date
  error?: string
}

export interface ProcessingJob {
  jobId: string
  eventId: string
  fingerprint: string
  isNew: boolean
  currentStage: ProcessingStage | null
  pendingStages: ProcessingStage[]
  stageProgress: StageProgress[]
  jobDir: string
  createdAt: Date
  updatedAt: Date
  tasks: ProcessingTask[]
  logs: BulletinLogEntry[]
  // Job configuration
  config?: {
    waveformSourceType?: string
    targetMethod?: string
    autoGf?: boolean
    isDeviatoric?: boolean
    centroidInversion?: boolean
  }
}

interface JobStore {
  // State
  jobs: Record<string, ProcessingJob>
  activeJobId: string | null

  // Actions - Job Management
  createJob: (job: InteractiveJobResponse, config?: ProcessingJob['config']) => void
  updateJob: (jobId: string, updates: Partial<ProcessingJob>) => void
  deleteJob: (jobId: string) => void
  setActiveJob: (jobId: string | null) => void
  getJob: (jobId: string) => ProcessingJob | undefined

  // Actions - Stage Management
  setCurrentStage: (jobId: string, stage: ProcessingStage | null) => void
  updateStageProgress: (jobId: string, stageProgress: StageProgress[]) => void
  setPendingStages: (jobId: string, stages: ProcessingStage[]) => void

  // Actions - Task Management
  addTask: (jobId: string, task: Omit<ProcessingTask, 'startedAt'>) => void
  updateTask: (jobId: string, taskId: string, updates: Partial<ProcessingTask>) => void
  getActiveTask: (jobId: string) => ProcessingTask | undefined

  // Actions - Log Management
  addLog: (jobId: string, log: Omit<BulletinLogEntry, 'id' | 'timestamp'>) => void
  addLogs: (jobId: string, logs: Array<Omit<BulletinLogEntry, 'id' | 'timestamp'>>) => void
  clearLogs: (jobId: string) => void

  // Utilities
  clearAllJobs: () => void
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

function generateLogId(): string {
  return `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function jobFromResponse(
  response: InteractiveJobResponse,
  config?: ProcessingJob['config']
): ProcessingJob {
  return {
    jobId: response.job_id,
    eventId: response.event_id,
    fingerprint: response.fingerprint,
    isNew: response.is_new,
    currentStage: response.current_stage,
    pendingStages: response.pending_stages,
    stageProgress: [],
    jobDir: response.job_dir,
    createdAt: new Date(),
    updatedAt: new Date(),
    tasks: [],
    logs: [],
    config,
  }
}

// ─── Store Implementation ─────────────────────────────────────────────────────

export const useJobStore = create<JobStore>()(
  persist(
    (set, get) => ({
      // Initial State
      jobs: {},
      activeJobId: null,

      // Job Management
      createJob: (response, config) => {
        const job = jobFromResponse(response, config)
        set((state) => ({
          jobs: { ...state.jobs, [job.jobId]: job },
          activeJobId: job.jobId,
        }))

        // Add creation log
        get().addLog(job.jobId, {
          level: 'success',
          message: `Job created for event ${job.eventId}${job.isNew ? ' (new)' : ' (resumed)'}`,
          source: 'system',
        })
      },

      updateJob: (jobId, updates) => {
        set((state) => {
          const job = state.jobs[jobId]
          if (!job) return state

          return {
            jobs: {
              ...state.jobs,
              [jobId]: {
                ...job,
                ...updates,
                updatedAt: new Date(),
              },
            },
          }
        })
      },

      deleteJob: (jobId) => {
        set((state) => {
          const { [jobId]: _, ...remainingJobs } = state.jobs
          return {
            jobs: remainingJobs,
            activeJobId: state.activeJobId === jobId ? null : state.activeJobId,
          }
        })
      },

      setActiveJob: (jobId) => {
        set({ activeJobId: jobId })
      },

      getJob: (jobId) => {
        return get().jobs[jobId]
      },

      // Stage Management
      setCurrentStage: (jobId, stage) => {
        get().updateJob(jobId, { currentStage: stage })

        if (stage) {
          get().addLog(jobId, {
            level: 'info',
            message: `Current stage: ${stage}`,
            source: 'system',
          })
        }
      },

      updateStageProgress: (jobId, stageProgress) => {
        get().updateJob(jobId, { stageProgress })

        // Log completed stages
        stageProgress
          .filter((sp) => sp.status === 'completed')
          .forEach((sp) => {
            const duration = sp.duration_s ? `${sp.duration_s.toFixed(1)}s` : 'unknown'
            get().addLog(jobId, {
              level: 'success',
              message: `Stage ${sp.stage} completed in ${duration}`,
              source: 'system',
            })
          })
      },

      setPendingStages: (jobId, stages) => {
        get().updateJob(jobId, { pendingStages: stages })
      },

      // Task Management
      addTask: (jobId, task) => {
        const newTask: ProcessingTask = {
          ...task,
          startedAt: new Date(),
        }

        set((state) => {
          const job = state.jobs[jobId]
          if (!job) return state

          return {
            jobs: {
              ...state.jobs,
              [jobId]: {
                ...job,
                tasks: [...job.tasks, newTask],
                updatedAt: new Date(),
              },
            },
          }
        })

        get().addLog(jobId, {
          level: 'info',
          message: `Starting task for stage: ${task.stage}`,
          source: 'system',
        })
      },

      updateTask: (jobId, taskId, updates) => {
        set((state) => {
          const job = state.jobs[jobId]
          if (!job) return state

          const tasks = job.tasks.map((task) =>
            task.taskId === taskId ? { ...task, ...updates } : task
          )

          return {
            jobs: {
              ...state.jobs,
              [jobId]: {
                ...job,
                tasks,
                updatedAt: new Date(),
              },
            },
          }
        })

        // Log task completion or failure
        if (updates.status === 'completed') {
          const task = get().jobs[jobId]?.tasks.find((t) => t.taskId === taskId)
          if (task) {
            const duration = updates.completedAt
              ? ((updates.completedAt.getTime() - task.startedAt.getTime()) / 1000).toFixed(1)
              : 'unknown'
            get().addLog(jobId, {
              level: 'success',
              message: `Task completed for ${task.stage} in ${duration}s`,
              source: 'system',
            })
          }
        } else if (updates.status === 'failed' && updates.error) {
          get().addLog(jobId, {
            level: 'error',
            message: `Task failed: ${updates.error}`,
            source: 'system',
          })
        }
      },

      getActiveTask: (jobId) => {
        const job = get().jobs[jobId]
        if (!job) return undefined

        return job.tasks.find(
          (task) => task.status === 'running' || task.status === 'pending'
        )
      },

      // Log Management
      addLog: (jobId, log) => {
        const logEntry: BulletinLogEntry = {
          id: generateLogId(),
          timestamp: new Date(),
          ...log,
        }

        set((state) => {
          const job = state.jobs[jobId]
          if (!job) return state

          return {
            jobs: {
              ...state.jobs,
              [jobId]: {
                ...job,
                logs: [...job.logs, logEntry],
                updatedAt: new Date(),
              },
            },
          }
        })
      },

      addLogs: (jobId, logs) => {
        const logEntries: BulletinLogEntry[] = logs.map((log) => ({
          id: generateLogId(),
          timestamp: new Date(),
          ...log,
        }))

        set((state) => {
          const job = state.jobs[jobId]
          if (!job) return state

          return {
            jobs: {
              ...state.jobs,
              [jobId]: {
                ...job,
                logs: [...job.logs, ...logEntries],
                updatedAt: new Date(),
              },
            },
          }
        })
      },

      clearLogs: (jobId) => {
        get().updateJob(jobId, { logs: [] })
      },

      // Utilities
      clearAllJobs: () => {
        set({ jobs: {}, activeJobId: null })
      },
    }),
    {
      name: 'scmtv-jobs',
      // Only persist essential data, not logs (can be large)
      partialize: (state) => ({
        jobs: Object.fromEntries(
          Object.entries(state.jobs).map(([id, job]) => [
            id,
            {
              ...job,
              logs: [], // Don't persist logs to localStorage
            },
          ])
        ),
        activeJobId: state.activeJobId,
      }),
    }
  )
)
