import type { BlocklyAPI, BlocklyBlock } from "../blocklyTypes";
import type { BlockToPythonContext } from "../contracts";
import type { TranslationError } from "../../../../types";
import { PYTHON_BLOCK_TYPES } from "../../pythonBlocks";

export function registerWhileBlock(blockly: BlocklyAPI): void {
    blockly.Blocks[PYTHON_BLOCK_TYPES.WHILE] = {
        init(this: BlocklyBlock) {
            this.jsonInit({
                type: PYTHON_BLOCK_TYPES.WHILE,
                message0: "while %1",
                args0: [{ type: "input_value", name: "CONDITION" }],
                message1: "do %1",
                args1: [{ type: "input_statement", name: "BODY" }],
                previousStatement: null,
                nextStatement: null,
                colour: 120,
                tooltip: "While loop",
            });
        },
    };
}

export function blockToPython(
    block: BlocklyBlock,
    errors: TranslationError[],
    ctx: BlockToPythonContext,
): string {
    const condition = ctx.blockToCode(
        block.getInputTargetBlock("CONDITION") as BlocklyBlock,
        errors,
    );
    const bodyBlock = block.getInputTargetBlock("BODY") as BlocklyBlock;
    const bodyCode = ctx.statementToCode(bodyBlock, errors);
    return `while ${condition}:\n${ctx.indent(bodyCode || "pass")}`;
}
