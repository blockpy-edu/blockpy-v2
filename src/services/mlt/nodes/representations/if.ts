import type { BlocklyAPI, BlocklyBlock } from "../blocklyTypes";
import type { BlockToPythonContext } from "../contracts";
import type { TranslationError } from "../../../../types";
import { PYTHON_BLOCK_TYPES } from "../../pythonBlocks";

export function registerIfBlock(blockly: BlocklyAPI): void {
    blockly.Blocks[PYTHON_BLOCK_TYPES.IF] = {
        init(this: BlocklyBlock) {
            this.jsonInit({
                type: PYTHON_BLOCK_TYPES.IF,
                message0: "if %1",
                args0: [{ type: "input_value", name: "CONDITION" }],
                message1: "do %1",
                args1: [{ type: "input_statement", name: "BODY" }],
                message2: "else %1",
                args2: [{ type: "input_statement", name: "ELSE" }],
                previousStatement: null,
                nextStatement: null,
                colour: 120,
                tooltip: "If/else statement",
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
    const elseBlock = block.getInputTargetBlock("ELSE") as BlocklyBlock;
    let code = `if ${condition}:\n`;
    const bodyCode = ctx.statementToCode(bodyBlock, errors);
    code += ctx.indent(bodyCode || "pass") + "\n";
    if (elseBlock) {
        code += "else:\n";
        code += ctx.indent(ctx.statementToCode(elseBlock, errors) || "pass") + "\n";
    }
    return code.trimEnd();
}
