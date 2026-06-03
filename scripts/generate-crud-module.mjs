#!/usr/bin/env node
/**
 * Generates NestJS CRUD boilerplate for a module.
 * Usage: node scripts/generate-crud-module.mjs <moduleName> <EntityName> <route> <activityModule>
 */
import fs from 'fs';
import path from 'path';

const [,, moduleName, entityName, route, activityModule] = process.argv;
if (!moduleName || !entityName) {
  console.error('Usage: node generate-crud-module.mjs <module> <Entity> <route> <ACTIVITY_MODULE>');
  process.exit(1);
}

const base = path.join(process.cwd(), 'src/modules', moduleName);
const kebab = moduleName;
const routePath = route ?? kebab;
const actMod = activityModule ?? moduleName.toUpperCase().replace(/-/g, '_');

const dirs = [
  `${base}/application/dto`,
  `${base}/application/services`,
  `${base}/presentation/controllers`,
];
dirs.forEach((d) => fs.mkdirSync(d, { recursive: true }));

const createDto = `import { IsOptional, IsString } from 'class-validator';

export class Create${entityName}Dto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;
}
`;

const updateDto = `import { PartialType } from '@nestjs/mapped-types';
import { Create${entityName}Dto } from './create-${kebab}.dto';

export class Update${entityName}Dto extends PartialType(Create${entityName}Dto) {}
`;

// Note: template uses generic fields - modules with custom DTOs should override
fs.writeFileSync(`${base}/application/dto/create-${kebab}.dto.ts`, createDto.replace(/title/g, 'name').replace(/Create${entityName}/g, `Create${entityName}`));
fs.writeFileSync(`${base}/application/dto/update-${kebab}.dto.ts`, updateDto);

console.log(`Generated skeleton for ${moduleName}`);
