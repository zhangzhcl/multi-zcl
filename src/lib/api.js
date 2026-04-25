// Renderer 进程侧的 API 调用，通过 IPC 发给 Main 进程执行
// Main 进程持有 Node.js 环境，可以使用 SDK 并绕过 CORS

export async function streamChat(provider, messages, onChunk, signal) {
  return new Promise((resolve, reject) => {
    signal?.addEventListener('abort', () => {
      window.api.chat.abort()
      reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }))
    })

    window.api.chat.stream(provider, messages, onChunk)
      .then(resolve)
      .catch(reject)
  })
}
