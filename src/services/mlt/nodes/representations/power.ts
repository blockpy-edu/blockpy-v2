import type { BlocklyAPI, BlocklyBlock } from "../blocklyTypes";
import type { BlockToPythonContext } from "../contracts";
import type { TranslationError } from "../../../../types";
import { PYTHON_BLOCK_TYPES } from "../../pythonBlocks";

export function registerPowerBlock(blockly: BlocklyAPI): void {
    blockly.Blocks[PYTHON_BLOCK_TYPES.POWER] = {
        init(this: BlocklyBlock) {
            this.jsonInit({
                type: PYTHON_BLOCK_TYPES.POWER,
                message0: "%1 ** %2",
                args0: [
                    { type: "input_value", name: "LEFT" },
                    { type: "input_value", name: "RIGHT" },
                ],
                output: "Number",
                colour: 230,
                tooltip: "Raise to the power",
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
    const right = ctx.blockToCode(block.getInputTargetBlock("RIGHT") as BlocklyBlock, errors);
    return `(${left} ** ${right})`;
}
