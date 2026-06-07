import os from 'node:os';
import path from 'node:path';
import { experimental_createSkillTool as createSkillTool } from 'bash-tool';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cachedSkill: { skill: any } | null = null;

const getSkill = async () => {
    if (cachedSkill) return cachedSkill;
    const { skill } = await createSkillTool({
        skillsDirectory: path.join(os.homedir(), '.agents', 'skills')
    });
    cachedSkill = { skill };
    return cachedSkill;
};

export default getSkill;
