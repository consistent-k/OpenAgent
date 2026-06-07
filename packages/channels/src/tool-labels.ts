/**
 * 工具名称 → 中文标签映射（共享）
 */

const TOOL_LABELS: Record<string, string> = {
    read_file: '阅读文件',
    write_file: '写入文件',
    edit_file: '编辑文件',
    execute_bash: '执行命令',
    grep: '搜索代码',
    glob: '搜索文件',
    fetch: '访问网页',
    read_directory: '浏览目录',
    web_search: '搜索网络',
    ask_user_question: '询问用户'
};

export function getToolLabel(toolName: string): string {
    return TOOL_LABELS[toolName] || toolName;
}
