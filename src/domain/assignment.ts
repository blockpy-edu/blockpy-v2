import type { AssignmentJson, AssignmentType } from '../api/types';

/** Camel-case domain projection of an assignment (docs/architecture/01 §1.1). */
export interface Assignment {
  id: number;
  name: string;
  url: string;
  type: AssignmentType;
  instructions: string;
  reviewed: boolean;
  hidden: boolean;
  public: boolean;
  subordinate: boolean;
  ipRanges: string;
  points: number;
  /** Raw JSON string; parse with parseAssignmentSettings when needed. */
  settings: string;
  onRun: string;
  onChange: string;
  onEval: string;
  startingCode: string;
  extraInstructorFiles: string;
  extraStartingFiles: string;
  forkedId: number | null;
  forkedVersion: number | null;
  ownerId: number;
  courseId: number;
  version: number;
  dateCreated: string;
  dateModified: string;
}

export function fromAssignmentJson(json: AssignmentJson): Assignment {
  return {
    id: json.id,
    name: json.name,
    url: json.url,
    type: json.type,
    instructions: json.instructions,
    reviewed: json.reviewed,
    hidden: json.hidden,
    public: json.public,
    subordinate: json.subordinate,
    ipRanges: json.ip_ranges,
    points: json.points,
    settings: json.settings,
    onRun: json.on_run,
    onChange: json.on_change,
    onEval: json.on_eval,
    startingCode: json.starting_code,
    extraInstructorFiles: json.extra_instructor_files,
    extraStartingFiles: json.extra_starting_files,
    forkedId: json.forked_id,
    forkedVersion: json.forked_version,
    ownerId: json.owner_id,
    courseId: json.course_id,
    version: json.version,
    dateCreated: json.date_created,
    dateModified: json.date_modified,
  };
}

export function toAssignmentJson(assignment: Assignment): AssignmentJson {
  return {
    id: assignment.id,
    name: assignment.name,
    url: assignment.url,
    type: assignment.type,
    instructions: assignment.instructions,
    reviewed: assignment.reviewed,
    hidden: assignment.hidden,
    public: assignment.public,
    subordinate: assignment.subordinate,
    ip_ranges: assignment.ipRanges,
    points: assignment.points,
    settings: assignment.settings,
    on_run: assignment.onRun,
    on_change: assignment.onChange,
    on_eval: assignment.onEval,
    starting_code: assignment.startingCode,
    extra_instructor_files: assignment.extraInstructorFiles,
    extra_starting_files: assignment.extraStartingFiles,
    forked_id: assignment.forkedId,
    forked_version: assignment.forkedVersion,
    owner_id: assignment.ownerId,
    course_id: assignment.courseId,
    version: assignment.version,
    date_created: assignment.dateCreated,
    date_modified: assignment.dateModified,
  };
}
