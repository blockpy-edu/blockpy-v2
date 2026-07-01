import type { BlocklyAPI, BlocklyBlock } from "../blocklyTypes";
import type { BlockToPythonContext } from "../contracts";
import type { TranslationError } from "../../../../types";
import { PYTHON_BLOCK_TYPES } from "../../pythonBlocks";

export function registerExprStmtBlock(blockly: BlocklyAPI): void {
    blockly.Blocks[PYTHON_BLOCK_TYPES.EXPR_STMT] = {
        init(this: BlocklyBlock) {
            this.jsonInit({
                type: PYTHON_BLOCK_TYPES.EXPR_STMT,
                message0: "%1",
                args0: [{ type: "input_value", name: "VALUE" }],
                previousStatement: null,
                nextStatement: null,
                colour: 300,
                tooltip: "Standalone expression statement",
            });
        },
    };
}

export function blockToPython(
    block: BlocklyBlock,
    errors: TranslationError[],
    ctx: BlockToPythonContext,
): string {
    const valueBlock = block.getInputTargetBlock("VALUE") as BlocklyBlock;
    return valueBlock ? ctx.blockToCode(valueBlock, errors) : "";
}
