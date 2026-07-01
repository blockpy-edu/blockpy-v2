import { beforeEach, describe, expect, it } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { blockpyAssignmentJson, submissionJson } from "../__fixtures__/wirePayloads";
import { ApiProvider } from "../ApiProvider";
import { BlockPyApiClient } from "../client";
import { createOfflineSeed, OfflineTransport } from "../offline";
import { useEditorInformation, useSaveFile } from "../queries";

const ENVELOPE = {
    assignment_id: blockpyAssignmentJson.id,
    assignment_group_id: null,
    course_id: blockpyAssignmentJson.course_id,
    submission_id: submissionJson.id,
    user_id: submissionJson.user_id,
    version: blockpyAssignmentJson.version,
};

function makeWrapper() {
    const seed = createOfflineSeed(blockpyAssignmentJson, submissionJson);
    const client = new BlockPyApiClient(
        new OfflineTransport(seed, "blockpy.offline.queries-test"),
        () => ENVELOPE,
    );
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return function Wrapper({ children }: { children: ReactNode }) {
        return (
            <QueryClientProvider client={queryClient}>
                <ApiProvider client={client}>{children}</ApiProvider>
            </QueryClientProvider>
        );
    };
}

describe("query hooks", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it("loads and maps editor information into domain types", async () => {
        const { result } = renderHook(
            () => useEditorInformation({ assignmentId: blockpyAssignmentJson.id }),
            { wrapper: makeWrapper() },
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data?.assignment.startingCode).toBe(
            blockpyAssignmentJson.starting_code,
        );
        expect(result.current.data?.submission?.score).toBe(1);
        expect(result.current.data?.submission?.correct).toBe(true);
    });

    it("saves a student file through the mutation", async () => {
        const wrapper = makeWrapper();
        const { result } = renderHook(() => useSaveFile(), { wrapper });

        result.current.mutate({
            kind: "student",
            filename: "answer.py",
            submissionId: submissionJson.id,
            code: 'print("from mutation")',
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.versionChange).toBe(false);
    });
});
