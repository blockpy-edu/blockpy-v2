import { PYTHON_BLOCK_TYPES } from "../../blockTypes";
import type { AstNodeModule } from "../types";

export const passStatementAstModule: AstNodeModule = {
    blockType: PYTHON_BLOCK_TYPES.CST_STMT,
    statementNodeTypes: ["PassStatement"],
    statementToBlock: () => "",
};
