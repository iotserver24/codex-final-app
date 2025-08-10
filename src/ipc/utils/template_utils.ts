import {
  type Template,
  type ApiTemplate,
  localTemplatesData,
} from "../../shared/templates";
import log from "electron-log";

const _logger = log.scope("template_utils");

// In-memory cache for API templates - disabled
let _apiTemplatesCache: Template[] | null = null;
let _apiTemplatesFetchPromise: Promise<Template[]> | null = null;

// Convert API template to our Template interface - disabled
function _convertApiTemplate(apiTemplate: ApiTemplate): Template {
  return {
    id: `${apiTemplate.githubOrg}/${apiTemplate.githubRepo}`,
    title: apiTemplate.title,
    description: apiTemplate.description,
    imageUrl: apiTemplate.imageUrl,
    githubUrl: `https://github.com/${apiTemplate.githubOrg}/${apiTemplate.githubRepo}`,
    isOfficial: false,
  };
}

// Fetch templates from API with caching - disabled, return empty array
export async function fetchApiTemplates(): Promise<Template[]> {
  // Disabled API templates fetch, just return empty array
  return [];
}

// Get all templates (local + API)
export async function getAllTemplates(): Promise<Template[]> {
  const apiTemplates = await fetchApiTemplates();
  return [...localTemplatesData, ...apiTemplates];
}

export async function getTemplateOrThrow(
  templateId: string,
): Promise<Template> {
  const allTemplates = await getAllTemplates();
  const template = allTemplates.find((template) => template.id === templateId);
  if (!template) {
    throw new Error(
      `Template ${templateId} not found. Please select a different template.`,
    );
  }
  return template;
}
