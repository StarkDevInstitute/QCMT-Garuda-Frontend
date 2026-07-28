// ─── Left Sidebar: Beach Ball + Controls ─────────────────────────────────────

import { useEffect, useRef, useState } from 'react'
import { useWaveformStore } from '@/stores/waveformStore'
import { BeachBall2D } from '@/components/BeachBall/BeachBall2D'
import type { NodalPlanes } from '@/types/seismology'

type TensorComponentKey = 'm11' | 'm22' | 'm33' | 'm12' | 'm13' | 'm23'

type TensorInputs = Record<TensorComponentKey, string>

export function WaveformLeftSidebar() {
  const { context, updateContext } = useWaveformStore()
  const [tensorMode, setTensorMode] = useState<'deviatoric' | 'double-couple'>('deviatoric')
  const [tensorOpen, setTensorOpen] = useState(true)
  const [syntheticsOpen, setSyntheticsOpen] = useState(true)
  const [nodalPlanesOpen, setNodalPlanesOpen] = useState(true)
  const [derivedOpen, setDerivedOpen] = useState(true)

  if (!context) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">No data loaded</p>
      </div>
    )
  }

  const solution = context.best_solution
  const event = context.event
  const fmt = (value: unknown, digits: number) => Number(value ?? 0).toFixed(digits)
  const tensor = solution?.tensor
  const momentTensor = solution?.moment_tensor
  const nodalPlanes = solution?.nodalPlanes
  const derived = solution?.derived

  const matrixValues = {
    m11: momentTensor?.m11 ?? tensor?.mrr ?? 0,
    m22: momentTensor?.m22 ?? tensor?.mtt ?? 0,
    m33: momentTensor?.m33 ?? tensor?.mpp ?? 0,
    m12: momentTensor?.m12 ?? tensor?.mrt ?? 0,
    m13: momentTensor?.m13 ?? tensor?.mrp ?? 0,
    m23: momentTensor?.m23 ?? tensor?.mtp ?? 0,
  }

  const matrixRows: Array<{ label: string; values: number[] }> = [
    { label: 'M1*', values: [matrixValues.m11, matrixValues.m12, matrixValues.m13] },
    { label: 'M2*', values: [matrixValues.m12, matrixValues.m22, matrixValues.m23] },
    { label: 'M3*', values: [matrixValues.m13, matrixValues.m23, matrixValues.m33] },
  ]

  const matrixExponent = getTensorExponent([
    matrixValues.m11,
    matrixValues.m22,
    matrixValues.m33,
    matrixValues.m12,
    matrixValues.m13,
    matrixValues.m23,
  ])

  const [tensorExponent, setTensorExponent] = useState(matrixExponent)
  const [tensorInputs, setTensorInputs] = useState<TensorInputs>(() =>
    buildTensorInputs(matrixValues, matrixExponent)
  )
  const [tensorExponentInput, setTensorExponentInput] = useState(String(matrixExponent))
  const [depthInput, setDepthInput] = useState(fmt(solution?.depth_km ?? event.depth_km, 1))
  const [selectedModel, setSelectedModel] = useState('INDO_MEAN_R')
  const [modelOptions, setModelOptions] = useState<string[]>(['INDO_MEAN_R'])
  const [targetMethod, setTargetMethod] = useState('—')
  const exponentDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setTensorInputs(buildTensorInputs(matrixValues, tensorExponent))
  }, [
    tensorExponent,
    matrixValues.m11,
    matrixValues.m22,
    matrixValues.m33,
    matrixValues.m12,
    matrixValues.m13,
    matrixValues.m23,
  ])

  useEffect(() => {
    setTensorExponentInput(String(tensorExponent))
  }, [tensorExponent])

  useEffect(() => {
    setDepthInput(fmt(solution?.depth_km ?? event.depth_km, 1))
  }, [solution?.depth_km, event.depth_km])

  useEffect(() => {
    let cancelled = false

    const loadGreenFunctions = async () => {
      const fallbackModel = 'INDO_MEAN_R'
      const fallbackOptions = [
        'INDO_MEAN_R',
        'CC_5_R',
        'CC_4_R',
        'TC_5_R',
        'OC_4_R',
        'TC_4_R',
        'OC_2_R',
        'CC_2_R',
        'OC_3_R',
        'CC_1_R',
        'TC_3_R',
      ]

      const applyModelPayload = (payload: {
        primary_model?: string
        nearest_green_functions?: string[]
        green_functions?: string[]
        target_method?: string
      }) => {
        const normalizedPrimary = payload.primary_model
          ? payload.primary_model.replace(/_R$/i, '') + '_R'
          : undefined

        const normalizeModelValue = (value: string): string =>
          value.replace(/_R$/i, '') + '_R'

        const uniqueOptions = Array.from(
          new Set([
            ...(normalizedPrimary ? [normalizedPrimary] : []),
            ...(payload.nearest_green_functions ?? []).map(normalizeModelValue),
            ...(payload.green_functions ?? []).map(normalizeModelValue),
          ].filter((value): value is string => Boolean(value && value.trim())))
        )

        const options = uniqueOptions.length > 0 ? uniqueOptions : fallbackOptions
        const defaultModel = normalizedPrimary ?? options[0] ?? fallbackModel
        const nextTargetMethod = payload.target_method?.trim() || '—'

        setModelOptions(options)
        setSelectedModel(defaultModel)
        setTargetMethod(nextTargetMethod)
      }

      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const { platform } = await import('@/lib/platform')
          const response = await platform.getJobGreenFunctions(context.job_id, {
            topN: 10,
            primaryModel: fallbackModel,
          })

          if (cancelled) return
          applyModelPayload(response)
          return
        } catch {
          if (cancelled) return
          try {
            const response = await fetch(
              `/autoqcmt/v1/interactive-processor/jobs/${encodeURIComponent(context.job_id)}/green-functions?top_n=10&primary_model=${encodeURIComponent(fallbackModel)}`,
              { headers: { accept: 'application/json' } }
            )

            if (!response.ok) {
              throw new Error('Direct green-functions fetch failed')
            }

            const payload = (await response.json()) as {
              primary_model?: string
              nearest_green_functions?: string[]
              green_functions?: string[]
              target_method?: string
            }

            if (cancelled) return
            applyModelPayload(payload)
            return
          } catch {
            if (cancelled) return
          }

          if (attempt === 1) {
            setModelOptions(fallbackOptions)
            setSelectedModel(fallbackModel)
            setTargetMethod(context.params.inversion_method || '—')
          }
        }
      }
    }

    void loadGreenFunctions()

    return () => {
      cancelled = true
    }
  }, [context.job_id])

  useEffect(() => {
    if (exponentDebounceRef.current) {
      clearTimeout(exponentDebounceRef.current)
      exponentDebounceRef.current = null
    }

    if (!/^-?\d+$/.test(tensorExponentInput)) {
      return
    }

    if (tensorExponentInput === String(tensorExponent)) {
      return
    }

    exponentDebounceRef.current = setTimeout(() => {
      commitExponentChange(tensorExponentInput)
    }, 1000)

    return () => {
      if (exponentDebounceRef.current) {
        clearTimeout(exponentDebounceRef.current)
        exponentDebounceRef.current = null
      }
    }
  }, [tensorExponent, tensorExponentInput])

  const matrixLayout: Array<{ label: string; keys: TensorComponentKey[] }> = [
    { label: 'M1*', keys: ['m11', 'm12', 'm13'] },
    { label: 'M2*', keys: ['m12', 'm22', 'm23'] },
    { label: 'M3*', keys: ['m13', 'm23', 'm33'] },
  ]

  const commitTensorChange = (key: TensorComponentKey, inputValue: string) => {
    if (!context || !context.best_solution) return
    const parsed = Number(inputValue)
    if (!Number.isFinite(parsed)) {
      setTensorInputs((prev) => ({
        ...prev,
        [key]: formatScaledTensorValue(matrixValues[key], tensorExponent),
      }))
      return
    }

    const rawValue = parsed * Math.pow(10, tensorExponent)
    const nextMomentTensor = {
      m11: matrixValues.m11,
      m22: matrixValues.m22,
      m33: matrixValues.m33,
      m12: matrixValues.m12,
      m13: matrixValues.m13,
      m23: matrixValues.m23,
      [key]: rawValue,
    }

    updateContext({
      ...context,
      best_solution: {
        ...context.best_solution,
        moment_tensor: nextMomentTensor,
        tensor: {
          mrr: nextMomentTensor.m11,
          mtt: nextMomentTensor.m22,
          mpp: nextMomentTensor.m33,
          mrt: nextMomentTensor.m12,
          mrp: nextMomentTensor.m13,
          mtp: nextMomentTensor.m23,
        },
      },
    })
  }

  const commitExponentChange = (inputValue: string) => {
    const trimmed = inputValue.trim()
    if (!/^-?\d+$/.test(trimmed)) {
      setTensorExponentInput(String(tensorExponent))
      return
    }

    const parsed = Number.parseInt(trimmed, 10)
    if (!Number.isFinite(parsed)) {
      setTensorExponentInput(String(tensorExponent))
      return
    }

    setTensorExponent(parsed)
    setTensorInputs(buildTensorInputs(matrixValues, parsed))
  }

  const resetExponentToBest = () => {
    setTensorExponent(matrixExponent)
    setTensorExponentInput(String(matrixExponent))
    setTensorInputs(buildTensorInputs(matrixValues, matrixExponent))
  }

  const commitDepthChange = (inputValue: string) => {
    const parsed = Number(inputValue.trim())
    if (!Number.isFinite(parsed)) {
      setDepthInput(fmt(solution?.depth_km ?? event.depth_km, 1))
      return
    }

    const rounded = Number(parsed.toFixed(1))
    setDepthInput(rounded.toFixed(1))

    updateContext({
      ...context,
      event: {
        ...context.event,
        depth_km: rounded,
      },
      best_solution: context.best_solution
        ? {
            ...context.best_solution,
            depth_km: rounded,
          }
        : context.best_solution,
    })
  }

  const beachBallNodalPlanes: NodalPlanes | null = nodalPlanes ?? null

  const stationCount = Object.keys(context.valid_waveforms || {}).length

  const latitude = solution?.latitude ?? event.lat
  const longitude = solution?.longitude ?? event.lon
  const latitudeText = Number.isFinite(latitude) ? `${latitude.toFixed(2)}°` : '—'
  const longitudeText = Number.isFinite(longitude) ? `${longitude.toFixed(2)}°` : '—'

  return (
    <div className="p-2 text-[11px]">
      <section className="rounded border border-slate-300 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-2 grid grid-cols-2 overflow-hidden rounded border border-slate-300 text-[10px] dark:border-slate-700">
          <button
            type="button"
            onClick={() => setTensorMode('deviatoric')}
            className={`px-2 py-1 font-medium ${tensorMode === 'deviatoric' ? 'bg-[#0075ff] text-white' : 'bg-slate-200 text-slate-600 dark:bg-slate-900 dark:text-slate-400'}`}
          >
            Deviatoric
          </button>
          <button
            type="button"
            onClick={() => setTensorMode('double-couple')}
            className={`px-2 py-1 font-medium ${tensorMode === 'double-couple' ? 'bg-[#0075ff] text-white' : 'bg-slate-200 text-slate-600 dark:bg-slate-900 dark:text-slate-400'}`}
          >
            Double couple
          </button>
        </div>

        <div className="flex justify-center rounded border border-slate-300 bg-slate-100 py-1 dark:border-slate-700 dark:bg-slate-800/70">
          <BeachBall2D
            nodalPlanes={beachBallNodalPlanes ?? { nodalPlane1: { strike: { value: 0 }, dip: { value: 0 }, rake: { value: 0 } } }}
            size={140}
            compressionColor="#d1d5db"
            dilatationColor="#52df00"
            strokeColor="#4b5563"
            northLabelColor="#4b5563"
          />
        </div>

        <div className="mt-2 overflow-visible rounded border border-slate-300 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setTensorOpen((v) => !v)}
            className="flex w-full items-center justify-between bg-slate-200 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300"
          >
            <span>TENSOR</span>
            <span
              className={`inline-flex h-3 w-3 items-center justify-center text-[10px] leading-none transition-transform ${tensorOpen ? 'rotate-0' : '-rotate-90'}`}
              aria-hidden="true"
            >
              ▾
            </span>
          </button>

          {tensorOpen && (
            <div className="border-t border-slate-300 p-2 dark:border-slate-700">
              <div className="rounded border border-slate-300 bg-slate-50 p-1.5 dark:border-slate-700 dark:bg-slate-900/70">
                <div className="mb-1 grid grid-cols-[48px_repeat(3,minmax(0,1fr))] gap-1 text-[10px]">
                  <div />
                  <div className="text-center font-semibold text-slate-600 dark:text-slate-300">M*1</div>
                  <div className="text-center font-semibold text-slate-600 dark:text-slate-300">M*2</div>
                  <div className="text-center font-semibold text-slate-600 dark:text-slate-300">M*3</div>
                </div>

                <div className="space-y-1">
                  {matrixLayout.map((row, rowIndex) => (
                    <div key={row.label} className="grid grid-cols-[48px_repeat(3,minmax(0,1fr))] items-center gap-1">
                      <div className="px-1 text-[10px] font-semibold text-slate-600 dark:text-slate-300">{row.label}</div>
                      {row.keys.map((key, colIndex) => {
                        const isLowerTriangle = rowIndex > colIndex
                        return (
                          <input
                            key={`${row.label}-${key}-${colIndex}`}
                            disabled={isLowerTriangle}
                            value={tensorInputs[key]}
                            onChange={(event) => {
                              if (isLowerTriangle) return
                              const value = event.target.value
                              if (/^-?\d*(?:\.\d*)?$/.test(value)) {
                                setTensorInputs((prev) => ({ ...prev, [key]: value }))
                              }
                            }}
                            onBlur={(event) => {
                              if (isLowerTriangle) return
                              commitTensorChange(key, event.target.value)
                            }}
                            className={`h-6 w-full rounded border border-slate-300 px-1 text-center font-mono text-[10px] dark:border-slate-700 ${
                              isLowerTriangle
                                ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                                : 'bg-white text-slate-700 dark:bg-slate-900 dark:text-slate-100'
                            }`}
                          />
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-2 flex items-start gap-2 text-[10px]">
                <span className="min-w-[54px] pt-1 text-slate-500 dark:text-slate-400">Exponent:</span>
                <div className="flex w-full items-center gap-2">
                  <span className="whitespace-nowrap text-slate-500 dark:text-slate-400">1E</span>
                  <input
                    value={tensorExponentInput}
                    onChange={(event) => {
                      const value = event.target.value
                      if (/^-?\d*$/.test(value)) {
                        setTensorExponentInput(value)
                      }
                    }}
                    className="h-6 w-full rounded border border-slate-300 bg-white px-2 font-mono text-[10px] dark:border-slate-700 dark:bg-slate-900"
                  />
                  <button
                    type="button"
                    onClick={resetExponentToBest}
                    className="h-6 rounded border border-slate-300 bg-slate-100 px-2 text-[10px] font-medium text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-2 overflow-hidden rounded border border-slate-300 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setSyntheticsOpen((v) => !v)}
            className="flex w-full items-center justify-between bg-slate-200 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300"
          >
            <span>SYNTHETICS</span>
            <span
              className={`inline-flex h-3 w-3 items-center justify-center text-[10px] leading-none transition-transform ${syntheticsOpen ? 'rotate-0' : '-rotate-90'}`}
              aria-hidden="true"
            >
              ▾
            </span>
          </button>

          {syntheticsOpen && (
            <div className="border-t border-slate-300 p-2 dark:border-slate-700">
              <div className="space-y-1 text-[10px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-600 dark:text-slate-300">Target method:</span>
                  <span className="font-mono text-right text-slate-800 dark:text-slate-100">{targetMethod}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-600 dark:text-slate-300">Model:</span>
                  <select
                    value={selectedModel}
                    onChange={(event) => setSelectedModel(event.target.value)}
                    className="h-5 min-w-[130px] rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-right text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  >
                    {modelOptions.length > 0 ? (
                      modelOptions.map((option) => (
                        <option key={option} value={option}>
                          {formatModelOptionLabel(option)}
                        </option>
                      ))
                    ) : (
                      <option value={selectedModel}>{formatModelOptionLabel(selectedModel)}</option>
                    )}
                  </select>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-600 dark:text-slate-300">Depth (km):</span>
                  <input
                    value={depthInput}
                    onChange={(event) => {
                      const value = event.target.value
                      if (/^-?\d*(?:\.\d*)?$/.test(value)) {
                        setDepthInput(value)
                      }
                    }}
                    onBlur={(event) => commitDepthChange(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        commitDepthChange((event.target as HTMLInputElement).value)
                      }
                    }}
                    className="h-5 w-20 rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-right text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-600 dark:text-slate-300">Latitude:</span>
                  <span className="font-mono text-right text-slate-800 dark:text-slate-100">{latitudeText}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-600 dark:text-slate-300">Longitude:</span>
                  <span className="font-mono text-right text-slate-800 dark:text-slate-100">{longitudeText}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-2 overflow-hidden rounded border border-slate-300 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setNodalPlanesOpen((v) => !v)}
            className="flex w-full items-center justify-between bg-slate-200 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300"
          >
            <span>NodalPlanes</span>
            <span
              className={`inline-flex h-3 w-3 items-center justify-center text-[10px] leading-none transition-transform ${nodalPlanesOpen ? 'rotate-0' : '-rotate-90'}`}
              aria-hidden="true"
            >
              ▾
            </span>
          </button>

          {nodalPlanesOpen && (
            <div className="border-t border-slate-300 p-2 dark:border-slate-700">
              <div className="grid grid-cols-[42px_repeat(3,minmax(0,1fr))] gap-1 text-[10px]">
                <div />
                <div className="text-center font-semibold text-slate-600 dark:text-slate-300">Strike</div>
                <div className="text-center font-semibold text-slate-600 dark:text-slate-300">Dip</div>
                <div className="text-center font-semibold text-slate-600 dark:text-slate-300">Rake</div>

                <div className="px-1 font-semibold text-slate-600 dark:text-slate-300">NP1</div>
                <ValueCell value={nodalPlanes?.nodalPlane1?.strike?.value} />
                <ValueCell value={nodalPlanes?.nodalPlane1?.dip?.value} />
                <ValueCell value={nodalPlanes?.nodalPlane1?.rake?.value} />

                <div className="px-1 font-semibold text-slate-600 dark:text-slate-300">NP2</div>
                <ValueCell value={nodalPlanes?.nodalPlane2?.strike?.value} />
                <ValueCell value={nodalPlanes?.nodalPlane2?.dip?.value} />
                <ValueCell value={nodalPlanes?.nodalPlane2?.rake?.value} />
              </div>
            </div>
          )}
        </div>

        <div className="mt-2 overflow-hidden rounded border border-slate-300 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setDerivedOpen((v) => !v)}
            className="flex w-full items-center justify-between bg-slate-200 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300"
          >
            <span>Derived values</span>
            <span
              className={`inline-flex h-3 w-3 items-center justify-center text-[10px] leading-none transition-transform ${derivedOpen ? 'rotate-0' : '-rotate-90'}`}
              aria-hidden="true"
            >
              ▾
            </span>
          </button>

          {derivedOpen && (
            <div className="space-y-1 border-t border-slate-300 bg-slate-100 p-2 text-[11px] dark:border-slate-700 dark:bg-slate-900/60">
              <DerivedRow
                label="Scalar moment"
                value={formatScalarMoment(solution?.scalar_moment)}
              />
              <DerivedRow
                label="Mw"
                value={solution?.magnitude_mw != null ? solution.magnitude_mw.toFixed(2) : '—'}
                strong
              />
              <DerivedRow
                label="Variance Reduction"
                value={solution?.variance_reduction != null ? `${(solution.variance_reduction * 100).toFixed(1)} %` : '—'}
              />
              <DerivedRow
                label="Avg. scale"
                value={derived?.avg_scale != null ? derived.avg_scale.toFixed(2) : '—'}
              />
              <DerivedRow
                label="Stations used"
                value={derived?.stations_used != null ? String(Math.round(derived.stations_used)) : '—'}
              />
              <DerivedRow
                label="Azimuthal gap"
                value={derived?.azimuthal_gap != null ? `${derived.azimuthal_gap.toFixed(1)}°` : '—'}
              />
              <DerivedRow
                label="DC"
                value={solution?.dc_perc != null ? `${solution.dc_perc.toFixed(1)} %` : '—'}
              />
              <DerivedRow
                label="CLVD"
                value={solution?.clvd_perc != null ? `${solution.clvd_perc.toFixed(1)} %` : '—'}
              />
              <DerivedRow
                label="ISO"
                value={solution?.iso_perc != null ? `${solution.iso_perc.toFixed(1)} %` : '—'}
              />
              <DerivedRow
                label="DC100"
                value={derived?.dc100 != null ? `${derived.dc100.toFixed(1)} %` : '—'}
              />
              <DerivedRow
                label="CLVD100"
                value={derived?.clvd100 != null ? `${derived.clvd100.toFixed(1)} %` : '—'}
              />
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function getTensorExponent(values: number[]): number {
  const maxAbs = values.reduce((max, value) => {
    const abs = Math.abs(value)
    return Number.isFinite(abs) ? Math.max(max, abs) : max
  }, 0)

  if (maxAbs <= 0) return 0
  return Math.floor(Math.log10(maxAbs))
}

function buildTensorInputs(
  values: Record<TensorComponentKey, number>,
  exponent: number
): TensorInputs {
  return {
    m11: formatScaledTensorValue(values.m11, exponent),
    m22: formatScaledTensorValue(values.m22, exponent),
    m33: formatScaledTensorValue(values.m33, exponent),
    m12: formatScaledTensorValue(values.m12, exponent),
    m13: formatScaledTensorValue(values.m13, exponent),
    m23: formatScaledTensorValue(values.m23, exponent),
  }
}

function formatScaledTensorValue(value: number, exponent: number): string {
  if (!Number.isFinite(value)) return '0'
  const scale = Math.pow(10, exponent)
  if (!Number.isFinite(scale) || scale === 0) return '0'
  const normalized = value / scale
  return normalized.toFixed(3)
}

function ValueCell({ value }: { value?: number }) {
  return (
    <div className="rounded border border-slate-300 bg-white px-1 py-0.5 text-center font-mono text-[10px] text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
      {value != null && Number.isFinite(value) ? value.toFixed(2) : '—'}
    </div>
  )
}

function DerivedRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-slate-700 dark:text-slate-300">{label}:</span>
      <span className={`font-mono ${strong ? 'font-bold text-slate-900 dark:text-slate-100' : 'text-slate-800 dark:text-slate-200'}`}>
        {value}
      </span>
    </div>
  )
}

function formatScalarMoment(value?: number): string {
  if (value == null || !Number.isFinite(value) || value === 0) return '—'
  const exponent = Math.floor(Math.log10(Math.abs(value)))
  const mantissa = value / Math.pow(10, exponent)
  return `${mantissa.toFixed(2)} E${exponent} Nm`
}

function formatModelOptionLabel(value: string): string {
  return value
    .replace(/_R$/i, '')
    .replace(/_/g, ' ')
}
