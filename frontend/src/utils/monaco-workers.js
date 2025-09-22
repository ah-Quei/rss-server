// Monaco Editor Web Workers 配置（Vite 生产可用）
// 使用 ESM 方式显式导入 worker 构造器，确保构建后生成正确的静态资源文件

import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import CssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import HtmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

if (typeof window !== 'undefined') {
  // 关闭全局 API 暴露（推荐）
  // @see https://github.com/microsoft/monaco-editor/blob/main/docs/integrate-esm.md
  window.MonacoEnvironment = {
    globalAPI: false,
    getWorker(workerId, label) {
      switch (label) {
        case 'json':
          return new JsonWorker()
        case 'css':
        case 'scss':
        case 'less':
          return new CssWorker()
        case 'html':
        case 'handlebars':
        case 'razor':
          return new HtmlWorker()
        case 'typescript':
        case 'javascript':
          return new TsWorker()
        default:
          return new EditorWorker()
      }
    }
  }
}

export function setupMonacoWorkers() {
  // 仅用于需要时手动调用，这里主要靠入口全局引入生效
  // 防止 Tree-shaking，保留对各 worker 的引用
  void EditorWorker; void JsonWorker; void CssWorker; void HtmlWorker; void TsWorker;
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line no-console
    console.log('Monaco Editor workers configured for production & CSP compliance')
  }
}