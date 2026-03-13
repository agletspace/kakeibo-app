import { createCanvas } from 'canvas'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

function drawIcon(size) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  const radius = size * 0.22

  // 背景（角丸）
  ctx.beginPath()
  ctx.moveTo(radius, 0)
  ctx.lineTo(size - radius, 0)
  ctx.quadraticCurveTo(size, 0, size, radius)
  ctx.lineTo(size, size - radius)
  ctx.quadraticCurveTo(size, size, size - radius, size)
  ctx.lineTo(radius, size)
  ctx.quadraticCurveTo(0, size, 0, size - radius)
  ctx.lineTo(0, radius)
  ctx.quadraticCurveTo(0, 0, radius, 0)
  ctx.closePath()
  ctx.fillStyle = '#1D9E75'
  ctx.fill()

  // 財布本体
  const wx = size * 0.18
  const wy = size * 0.31
  const ww = size * 0.64
  const wh = size * 0.43
  const wr = size * 0.06

  ctx.beginPath()
  ctx.moveTo(wx + wr, wy)
  ctx.lineTo(wx + ww - wr, wy)
  ctx.quadraticCurveTo(wx + ww, wy, wx + ww, wy + wr)
  ctx.lineTo(wx + ww, wy + wh - wr)
  ctx.quadraticCurveTo(wx + ww, wy + wh, wx + ww - wr, wy + wh)
  ctx.lineTo(wx + wr, wy + wh)
  ctx.quadraticCurveTo(wx, wy + wh, wx, wy + wh - wr)
  ctx.lineTo(wx, wy + wr)
  ctx.quadraticCurveTo(wx, wy, wx + wr, wy)
  ctx.closePath()
  ctx.fillStyle = '#085041'
  ctx.fill()

  // 財布の帯
  ctx.fillStyle = '#0F6E56'
  ctx.fillRect(wx, wy + wh * 0.2, ww, wh * 0.25)

  // コインポケット
  const px = size * 0.62
  const py = size * 0.38
  const pw = size * 0.2
  const ph = size * 0.16
  const pr = size * 0.04

  ctx.beginPath()
  ctx.moveTo(px + pr, py)
  ctx.lineTo(px + pw - pr, py)
  ctx.quadraticCurveTo(px + pw, py, px + pw, py + pr)
  ctx.lineTo(px + pw, py + ph - pr)
  ctx.quadraticCurveTo(px + pw, py + ph, px + pw - pr, py + ph)
  ctx.lineTo(px + pr, py + ph)
  ctx.quadraticCurveTo(px, py + ph, px, py + ph - pr)
  ctx.lineTo(px, py + pr)
  ctx.quadraticCurveTo(px, py, px + pr, py)
  ctx.closePath()
  ctx.fillStyle = '#1D9E75'
  ctx.fill()

  // コイン
  ctx.beginPath()
  ctx.arc(px + pw / 2, py + ph / 2, size * 0.04, 0, Math.PI * 2)
  ctx.fillStyle = '#9FE1CB'
  ctx.fill()

  return canvas
}

const sizes = [192, 512, 180]
const names = ['icon-192.png', 'icon-512.png', 'apple-touch-icon.png']

for (let i = 0; i < sizes.length; i++) {
  const canvas = drawIcon(sizes[i])
  const buffer = canvas.toBuffer('image/png')
  writeFileSync(join('public', names[i]), buffer)
  console.log(`✅ ${names[i]} を生成しました`)
}