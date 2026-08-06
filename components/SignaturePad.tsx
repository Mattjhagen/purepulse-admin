'use client'
import { useRef, useEffect, useImperativeHandle, forwardRef, useState } from 'react'

export type SignaturePadHandle = {
  isEmpty: () => boolean
  toDataURL: () => string
  clear: () => void
}

type Props = {
  width?: number
  height?: number
  penColor?: string
  onBegin?: () => void
  onEnd?: () => void
}

const SignaturePad = forwardRef<SignaturePadHandle, Props>(function SignaturePad(
  { width, height = 200, penColor = '#111111', onBegin, onEnd },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)
  const [empty, setEmpty] = useState(true)

  // Scale canvas to device pixel ratio for crisp rendering
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = 2.2
    ctx.strokeStyle = penColor
  }, [penColor])

  function getPos(e: MouseEvent | Touch, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left),
      y: (e.clientY - rect.top),
    }
  }

  function beginStroke(pos: { x: number; y: number }) {
    drawing.current = true
    lastPos.current = pos
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, 1.1, 0, Math.PI * 2)
    ctx.fillStyle = penColor
    ctx.fill()
    if (empty) { setEmpty(false); onBegin?.() }
  }

  function drawStroke(pos: { x: number; y: number }) {
    if (!drawing.current || !lastPos.current) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    lastPos.current = pos
  }

  function endStroke() {
    if (!drawing.current) return
    drawing.current = false
    lastPos.current = null
    onEnd?.()
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    function onMouseDown(e: MouseEvent) { beginStroke(getPos(e, canvas!)) }
    function onMouseMove(e: MouseEvent) { drawStroke(getPos(e, canvas!)) }
    function onMouseUp() { endStroke() }
    function onMouseLeave() { endStroke() }

    function onTouchStart(e: TouchEvent) {
      e.preventDefault()
      beginStroke(getPos(e.touches[0], canvas!))
    }
    function onTouchMove(e: TouchEvent) {
      e.preventDefault()
      drawStroke(getPos(e.touches[0], canvas!))
    }
    function onTouchEnd(e: TouchEvent) {
      e.preventDefault()
      endStroke()
    }

    canvas.addEventListener('mousedown', onMouseDown)
    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('mouseup', onMouseUp)
    canvas.addEventListener('mouseleave', onMouseLeave)
    canvas.addEventListener('touchstart', onTouchStart, { passive: false })
    canvas.addEventListener('touchmove', onTouchMove, { passive: false })
    canvas.addEventListener('touchend', onTouchEnd, { passive: false })

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown)
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('mouseup', onMouseUp)
      canvas.removeEventListener('mouseleave', onMouseLeave)
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove', onTouchMove)
      canvas.removeEventListener('touchend', onTouchEnd)
    }
  })

  useImperativeHandle(ref, () => ({
    isEmpty: () => empty,
    toDataURL: () => {
      const canvas = canvasRef.current!
      return canvas.toDataURL('image/png')
    },
    clear: () => {
      const canvas = canvasRef.current!
      const ctx = canvas.getContext('2d')!
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      setEmpty(true)
    },
  }))

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        width: width ? `${width}px` : '100%',
        height: `${height}px`,
        borderRadius: 8,
        border: '1.5px solid #d1d5db',
        background: '#fff',
        cursor: 'crosshair',
        touchAction: 'none',
      }}
    />
  )
})

export default SignaturePad
