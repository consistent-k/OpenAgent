/**
 * 工具名称 → 本地化标签映射（通过 i18n）
 */
import { t } from '@oagent/i18n';

const TOOL_LABEL_KEYS: Record<string, string> = {
    read_file: 'tool.label.readFile',
    write_file: 'tool.label.writeFile',
    edit_file: 'tool.label.editFile',
    execute_bash: 'tool.label.executeBash',
    grep: 'tool.label.grep',
    glob: 'tool.label.glob',
    fetch: 'tool.label.fetch',
    read_directory: 'tool.label.readDirectory',
    web_search: 'tool.label.webSearch',
    ask_user_question: 'tool.label.askUserQuestion'
};

export function getToolLabel(toolName: string): string {
    const key = TOOL_LABEL_KEYS[toolName];
    return key ? t(key) : toolName;
}
