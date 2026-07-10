import { describe, expect, it, vi } from "vitest";
import { BlockPy, legacySettingsToMountOptions, registerBlockPyGlobal } from "../legacy";

const LEGACY_SETTINGS = {
    "attachment.point": "#blockpy-div",
    urls: {
        loadAssignment: "/blockpy/load_assignment",
        saveFile: "/blockpy/save_file",
        logEvent: "/blockpy/log_event",
        updateSubmission: "/blockpy/update_submission",
        updateSubmissionStatus: "/blockpy/update_submission_status",
    },
    "user.id": 301,
    "user.name": "Ada Lovelace",
    "user.role": "student",
    "user.course_id": 12,
    "user.group_id": 88,
    access_token: "tok",
    "display.instructor": false,
    "display.read_only": false,
};

describe("legacySettingsToMountOptions", () => {
    it("maps the dotted-key legacy config to mount options", () => {
        const options = legacySettingsToMountOptions(LEGACY_SETTINGS);
        expect(options.user).toMatchObject({
            id: "301",
            name: "Ada Lovelace",
            role: "learner",
            courseId: "12",
            groupId: "88",
        });
        expect(options.server?.urls?.loadAssignment).toBe("/blockpy/load_assignment");
        expect(options.server?.accessToken).toBe("tok");
        expect(options.display?.readOnly).toBe(false);
    });

    it("maps legacy roles, honoring the instructor display flag", () => {
        expect(legacySettingsToMountOptions({ "user.role": "owner" }).user?.role).toBe(
            "instructor",
        );
        expect(legacySettingsToMountOptions({ "user.role": "grader" }).user?.role).toBe("ta");
        expect(legacySettingsToMountOptions({ "user.role": "anonymous" }).user?.role).toBe("guest");
        expect(
            legacySettingsToMountOptions({
                "user.role": "student",
                "display.instructor": true,
            }).user?.role,
        ).toBe("instructor");
    });

    it("builds a remote activity from the rendered group assignments", () => {
        const options = legacySettingsToMountOptions({
            ...LEGACY_SETTINGS,
            "group.name": "Week 3: Loops",
            "group.category": "homework",
            "group.assignments": [
                { id: 11, name: "Reading: loops", type: "reading" },
                { id: 12, name: "Loops quiz", type: "quiz" },
                { id: 13, name: "Code it", type: "blockpy" },
            ],
        });
        expect(options.activity).toMatchObject({
            id: "88",
            name: "Week 3: Loops",
            category: "homework",
        });
        expect(options.activity?.tasks.map((task) => task.id)).toEqual(["11", "12", "13"]);
        // Remote tasks must not carry inline content, so the provider
        // bootstraps them from the server.
        expect(options.activity?.tasks[0].startingCode).toBeUndefined();
    });

    it("forwards callback.success as onTaskCorrect", () => {
        const markCorrect = vi.fn();
        const options = legacySettingsToMountOptions({
            ...LEGACY_SETTINGS,
            "callback.success": markCorrect,
        });
        options.callbacks?.onTaskCorrect?.(42);
        expect(markCorrect).toHaveBeenCalledWith(42);
    });

    it("maps a single assignment id", () => {
        const options = legacySettingsToMountOptions({
            ...LEGACY_SETTINGS,
            "assignment.id": 478,
        });
        expect(options.assignment?.id).toBe("478");
    });
});

describe("BlockPy legacy class", () => {
    it("throws a clear error when the attachment point is missing", () => {
        expect(() => new BlockPy({ "attachment.point": "#missing" })).toThrow(/attachment point/);
    });

    it("registers the legacy global", () => {
        registerBlockPyGlobal();
        expect(window.blockpy?.BlockPy).toBe(BlockPy);
    });
});
