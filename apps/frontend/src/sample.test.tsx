import { render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'

// 簡易的なMSWサーバーをテスト内で作成
const server = setupServer(
  http.get('/api/test', () => {
    return HttpResponse.json({ message: 'MSW is working' })
  })
)

describe('Phase 1: テスト環境の動作確認', () => {
  beforeAll(() => server.listen())
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  test('Reactコンポーネントが正しくレンダリングされる', () => {
    render(<div>Hello Test</div>)
    expect(screen.getByText('Hello Test')).toBeInTheDocument()
  })

  test('DOM APIが使用できる', () => {
    const div = document.createElement('div')
    div.textContent = 'Test'
    expect(div.textContent).toBe('Test')
  })

  test('MSWによるAPIモックが動作する', async () => {
    const response = await fetch('/api/test')
    const data = await response.json()
    expect(data.message).toBe('MSW is working')
  })
})