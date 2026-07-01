import type { BlocklyAPI, BlocklyBlock } from "../blocklyTypes";
import type { BlockToPythonContext } from "../contracts";
import type { TranslationError } from "../../../../types";
import { PYTHON_BLOCK_TYPES } from "../../pythonBlocks";

export function registerDictBlock(blockly: BlocklyAPI): void {
    blockly.Blocks[PYTHON_BLOCK_TYPES.DICT] = {
        init(this: BlocklyBlock) {
            this.jsonInit({
                type: PYTHON_BLOCK_TYPES.DICT,
                message0: "%1",
                args0: [{ type: "field_input", name: "CODE", text: '{"key": 1}' }],
                output: null,
                colour: 260,
                tooltip: "Dictionary literal",
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
    const code = (block.getFieldValue("CODE") as string) || "{}";
    return code.trim() || "{}";
}
