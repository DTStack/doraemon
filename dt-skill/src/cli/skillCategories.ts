import { createRequire } from 'node:module';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const currentDir = dirname(fileURLToPath(import.meta.url));
// Source: ../../dist when running tests from src; dist layout after build.
const contractPath = currentDir.endsWith(`${sep}src${sep}cli`)
    ? resolve(currentDir, '../../dist/contracts/skill-categories/index.cjs')
    : resolve(currentDir, '../contracts/skill-categories/index.cjs');

const contract = require(contractPath);

export const SKILL_CATEGORY_OPTIONS = contract.SKILL_CATEGORY_OPTIONS as readonly string[];
export const SKILL_CATEGORY_SET = contract.SKILL_CATEGORY_SET as ReadonlySet<string>;
export const isValidSkillCategory = contract.isValidSkillCategory as (value: unknown) => boolean;
