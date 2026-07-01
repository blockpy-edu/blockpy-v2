import type { BlocklyAPI, BlocklyBlock } from "../blocklyTypes";
import type { BlockToPythonContext } from "../contracts";
import type { TranslationError } from "../../../../types";
import { PYTHON_BLOCK_TYPES } from "../../pythonBlocks";

export function registerAssignBlock(blockly: BlocklyAPI): void {
    blockly.Blocks[PYTHON_BLOCK_TYPES.ASSIGN] = {
        init(this: BlocklyBlock) {
            this.jsonInit({
                type: PYTHON_BLOCK_TYPES.ASSIGN,
                message0: "%1 = %2",
                args0: [
                    { type: "field_input", name: "VAR", text: "x" },
                    { type: "input_value", name: "VALUE" },
                ],
                previousStatement: null,
                nextStatement: null,
                colour: 330,
                tooltip: "Assign a value to a variable",
            });
        },
    };
}

export function blockToPython(
    block: BlocklyBlock,
    errors: TranslationError[],
    ctx: BlockToPythonContext,
): string {
    const varName = block.getFieldValue("VAR") as string;
    const valueBlock = block.getInputTargetBlock("VALUE") as BlocklyBlock;
    const value = valueBlock ? ctx.blockToCode(valueBlock, errors) : "None";
    return `${varName} = ${value}`;
}
