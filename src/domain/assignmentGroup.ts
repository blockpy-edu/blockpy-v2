import type { AssignmentGroupCategory, AssignmentGroupJson } from '../api/types';

export interface AssignmentGroup {
  id: number;
  name: string;
  url: string;
  category: AssignmentGroupCategory;
  position: number;
  forkedId: number | null;
  forkedVersion: number | null;
  ownerId: number;
  courseId: number;
  version: number;
}

export function fromAssignmentGroupJson(json: AssignmentGroupJson): AssignmentGroup {
  return {
    id: json.id,
    name: json.name,
    url: json.url,
    category: json.category,
    position: json.position,
    forkedId: json.forked_id,
    forkedVersion: json.forked_version,
    ownerId: json.owner_id,
    courseId: json.course_id,
    version: json.version,
  };
}
