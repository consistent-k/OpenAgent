import { askUserQuestionTool } from './askUserQuestion';
import { editFileTool } from './editFile';
import { executeBashTool } from './executeBash';
import { fetchTool } from './fetch';
import { globTool } from './glob';
import { grepTool } from './grep';
import { readDirectoryTool } from './readDirectory';
import { readFileTool } from './readFile';
import { webSearchTool } from './webSearch';
import { writeFileTool } from './writeFile';

export const tools = {
    read_file: readFileTool,
    read_directory: readDirectoryTool,
    write_file: writeFileTool,
    edit_file: editFileTool,
    execute_bash: executeBashTool,
    grep: grepTool,
    glob: globTool,
    fetch: fetchTool,
    web_search: webSearchTool,
    ask_user_question: askUserQuestionTool
};
