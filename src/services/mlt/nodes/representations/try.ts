import type { BlocklyAPI, BlocklyBlock } from "../blocklyTypes";
import type { BlockToPythonContext } from "../contracts";
import type { TranslationError } from "../../../../types";
import { PYTHON_BLOCK_TYPES } from "../../pythonBlocks";

export function registerTryBlock(blockly: BlocklyAPI): void {
    blockly.Blocks[PYTHON_BLOCK_TYPES.TRY] = {
        init(this: BlocklyBlock) {
            this.jsonInit({
                type: PYTHON_BLOCK_TYPES.TRY,
                message0: "try block %1",
                args0: [{ type: "field_input", name: "CODE", text: "try:\n    pass" }],
                previousStatement: null,
                nextStatement: null,
                colour: 120,
                tooltip: "Try/except/finally source fallback",
            });
        },
    };
}

export function blockToPython(
    block: BlocklyBlock,
    errors: TranslationError[],
    ctx: BlockToPythonContext,
): string {
    void errors;
    void ctx;
    return (block.getFieldValue("CODE") as string) || "";
}
