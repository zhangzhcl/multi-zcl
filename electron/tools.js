const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')

// Claude Code 工具定义 (Anthropic tool_use 格式)
const TOOL_DEFINITIONS = [
  {
    name: 'bash',
    description: 'Execute a bash/shell command. Use for running scripts, CLI tools, git, npm, etc.',
    input_schema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'The shell command to execute' },
        timeout: { type: 'number', description: 'Timeout in ms (default 30000)' },
      },
      required: ['command'],
    },
  },
  {
    name: 'read_file',
    description: 'Read the contents of a file.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute or relative file path' },
        offset: { type: 'number', description: 'Start line (1-indexed, optional)' },
        limit: { type: 'number', description: 'Number of lines to read (optional)' },
      },
      required: ['path'],
    },
  },
  {
    name: 'write_file',
    description: 'Write content to a file, creating it if it does not exist.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        content: { type: 'string' },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'edit_file',
    description: 'Replace exact text in a file. old_string must match exactly (including whitespace).',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        old_string: { type: 'string', description: 'Exact string to find' },
        new_string: { type: 'string', description: 'Replacement string' },
      },
      required: ['path', 'old_string', 'new_string'],
    },
  },
  {
    name: 'glob',
    description: 'Find files matching a glob pattern.',
    input_schema: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Glob pattern, e.g. "src/**/*.js"' },
        cwd: { type: 'string', description: 'Base directory (default: cwd)' },
      },
      required: ['pattern'],
    },
  },
  {
    name: 'grep',
    description: 'Search file contents with a regex pattern.',
    input_schema: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Regex pattern' },
        path: { type: 'string', description: 'Directory or file to search' },
        include: { type: 'string', description: 'File glob filter, e.g. "*.js"' },
      },
      required: ['pattern'],
    },
  },
]

// ─── 工具执行 ────────────────────────────────────────────────────────────────

async function executeTool(name, input, cwd) {
  try {
    switch (name) {
      case 'bash': return await toolBash(input, cwd)
      case 'read_file': return await toolReadFile(input, cwd)
      case 'write_file': return await toolWriteFile(input, cwd)
      case 'edit_file': return await toolEditFile(input, cwd)
      case 'glob': return await toolGlob(input, cwd)
      case 'grep': return await toolGrep(input, cwd)
      default: return { error: `Unknown tool: ${name}` }
    }
  } catch (err) {
    return { error: err.message }
  }
}

function toolBash(input, cwd) {
  return new Promise((resolve) => {
    const timeout = input.timeout ?? 30000
    const proc = spawn(input.command, [], {
      shell: true,
      cwd: cwd || process.cwd(),
      timeout,
    })
    let stdout = '', stderr = ''
    proc.stdout.on('data', d => { stdout += d.toString() })
    proc.stderr.on('data', d => { stderr += d.toString() })
    proc.on('close', (code) => {
      resolve({ stdout: stdout.slice(0, 50000), stderr: stderr.slice(0, 10000), exit_code: code })
    })
    proc.on('error', err => resolve({ error: err.message }))
  })
}

async function toolReadFile(input, cwd) {
  const filePath = resolvePath(input.path, cwd)
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  const offset = input.offset ? input.offset - 1 : 0
  const limit = input.limit ?? lines.length
  const selected = lines.slice(offset, offset + limit)
  return { content: selected.map((l, i) => `${offset + i + 1}\t${l}`).join('\n'), total_lines: lines.length }
}

async function toolWriteFile(input, cwd) {
  const filePath = resolvePath(input.path, cwd)
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, input.content, 'utf-8')
  return { success: true, path: filePath }
}

async function toolEditFile(input, cwd) {
  const filePath = resolvePath(input.path, cwd)
  const content = fs.readFileSync(filePath, 'utf-8')
  if (!content.includes(input.old_string)) {
    return { error: 'old_string not found in file' }
  }
  const newContent = content.replace(input.old_string, input.new_string)
  const tmp = filePath + '.tmp'
  fs.writeFileSync(tmp, newContent, 'utf-8')
  fs.renameSync(tmp, filePath)
  return { success: true }
}

async function toolGlob(input, cwd) {
  // 使用 Node 内置，不依赖 fast-glob
  const basePath = resolvePath(input.cwd || '.', cwd)
  const results = globSync(input.pattern, basePath)
  return { files: results, count: results.length }
}

async function toolGrep(input, cwd) {
  const searchPath = input.path ? resolvePath(input.path, cwd) : (cwd || process.cwd())
  const results = grepSync(input.pattern, searchPath, input.include)
  return { matches: results.slice(0, 200), total: results.length }
}

// ─── 简单 glob/grep 实现（不依赖外部包） ─────────────────────────────────────

function globSync(pattern, base) {
  const results = []
  function walk(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const e of entries) {
        if (e.name.startsWith('.') && !pattern.includes('.')) continue
        const full = path.join(dir, e.name)
        const rel = path.relative(base, full).replace(/\\/g, '/')
        if (e.isDirectory()) {
          walk(full)
        } else if (minimatch(rel, pattern)) {
          results.push(rel)
        }
      }
    } catch {}
  }
  walk(base)
  return results
}

function grepSync(pattern, searchPath, include) {
  const re = new RegExp(pattern, 'gm')
  const results = []
  function scan(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      const lines = content.split('\n')
      lines.forEach((line, i) => {
        if (re.test(line)) {
          results.push({ file: filePath, line: i + 1, content: line.trim() })
        }
        re.lastIndex = 0
      })
    } catch {}
  }
  function walk(p) {
    try {
      const stat = fs.statSync(p)
      if (stat.isFile()) {
        if (!include || minimatch(path.basename(p), include)) scan(p)
      } else if (stat.isDirectory()) {
        fs.readdirSync(p).forEach(e => {
          if (!e.startsWith('.')) walk(path.join(p, e))
        })
      }
    } catch {}
  }
  walk(searchPath)
  return results
}

// 极简 minimatch（支持 **, *, ? 和扩展名匹配）
function minimatch(str, pattern) {
  const regexStr = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '§§§')
    .replace(/\*/g, '[^/]*')
    .replace(/§§§/g, '.*')
    .replace(/\?/g, '[^/]')
  return new RegExp(`^${regexStr}$`).test(str)
}

function resolvePath(p, cwd) {
  if (path.isAbsolute(p)) return p
  return path.resolve(cwd || process.cwd(), p)
}

module.exports = { TOOL_DEFINITIONS, executeTool }
