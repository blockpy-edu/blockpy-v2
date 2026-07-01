import type { BlocklyAPI, BlocklyBlock } from "../blocklyTypes";
import type { BlockToPythonContext } from "../contracts";
import type { TranslationError } from "../../../../types";
import { PYTHON_BLOCK_TYPES } from "../../pythonBlocks";

export function registerAttrBlock(blockly: BlocklyAPI): void {
    blockly.Blocks[PYTHON_BLOCK_TYPES.ATTR] = {
        init(this: BlocklyBlock) {
            this.jsonInit({
                type: PYTHON_BLOCK_TYPES.ATTR,
                message0: "%1 . %2",
                args0: [
                    { type: "input_value", name: "OBJ" },
                    { type: "field_input", name: "ATTR", text: "attr" },
                ],
                output: null,
                colour: 330,
                tooltip: "Attribute access",
            });
        },
    };
}

export function blockToPython(
    block: BlocklyBlock,
    errors: TranslationError[],
    ctx: BlockToPythonContext,
): string {
    const obj = ctx.blockToCode(block.getInputTargetBlock("OBJ") as BlocklyBlock, errors);
    const attr = block.getFieldValue("ATTR") as string;
    return `${obj}.${attr}`;
}
