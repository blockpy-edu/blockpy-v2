import type { BlocklyAPI, BlocklyBlock } from "../blocklyTypes";
import type { BlockToPythonContext } from "../contracts";
import type { TranslationError } from "../../../../types";
import { PYTHON_BLOCK_TYPES } from "../../pythonBlocks";

export function registerForBlock(blockly: BlocklyAPI): void {
    blockly.Blocks[PYTHON_BLOCK_TYPES.FOR] = {
        init(this: BlocklyBlock) {
            this.jsonInit({
                type: PYTHON_BLOCK_TYPES.FOR,
                message0: "for %1 in %2",
                args0: [
                    { type: "field_input", name: "VAR", text: "i" },
                    { type: "input_value", name: "ITER" },
                ],
                message1: "do %1",
                args1: [{ type: "input_statement", name: "BODY" }],
                previousStatement: null,
                nextStatement: null,
                colour: 120,
                tooltip: "For loop",
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
    const iterBlock = block.getInputTargetBlock("ITER") as BlocklyBlock;
    const iter = iterBlock ? ctx.blockToCode(iterBlock, errors) : "[]";
    const bodyBlock = block.getInputTargetBlock("BODY") as BlocklyBlock;
    const bodyCode = ctx.statementToCode(bodyBlock, errors);
    return `for ${varName} in ${iter}:\n${ctx.indent(bodyCode || "pass")}`;
}
