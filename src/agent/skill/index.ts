import os from 'node:os';
import path from 'node:path';
import { experimental_createSkillTool as createSkillTool } from 'bash-tool';

const getSkill = async () => {
    const { skill } = await createSkillTool({
        skillsDirectory: path.join(os.homedir(), '.agents', 'skills')
    });

    return {
        skill
    };
};

export default getSkill;
