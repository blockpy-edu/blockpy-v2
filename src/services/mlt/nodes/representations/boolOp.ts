import type { BlocklyAPI, BlocklyBlock } from "../blocklyTypes";
import type { BlockToPythonContext } from "../contracts";
import type { TranslationError } from "../../../../types";
import { PYTHON_BLOCK_TYPES } from "../../pythonBlocks";

export function registerBoolOpBlock(blockly: BlocklyAPI): void {
    blockly.Blocks[PYTHON_BLOCK_TYPES.BOOL_OP] = {
        init(this: BlocklyBlock) {
            this.jsonInit({
                type: PYTHON_BLOCK_TYPES.BOOL_OP,
                message0: "%1 %2 %3",
                args0: [
                    { type: "input_value", name: "LEFT" },
                    {
                        type: "field_dropdown",
                        name: "OP",
                        options: [
                            ["and", "and"],
                            ["or", "or"],
                        ],
                    },
                    { type: "input_value", name: "RIGHT" },
                ],
                output: "Boolean",
                colour: 210,
                tooltip: "Boolean and/or",
            });
        },
    };
}

export function blockToPython(
    block: BlocklyBlock,
    errors: TranslationError[],
    ctx: BlockToPythonContext,
): string {
    const left = ctx.blockToCode(block.getInputTargetBlock("LEFT") as BlocklyBlock, errors);
    const op = block.getFieldValue("OP") as string;
    const right = ctx.blockToCode(block.getInputTargetBlock("RIGHT") as BlocklyBlock, errors);
    return `(${left} ${op} ${right})`;
}
