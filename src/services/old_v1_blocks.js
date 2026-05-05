Blockly.Blocks['ast_AnnAssignFull'] = {
    init: function () {
        this.appendValueInput("TARGET")
            .setCheck(null)
            .appendField("set");
        this.appendValueInput("ANNOTATION")
            .setCheck(null)
            .appendField(":");
        this.setInputsInline(true);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(BlockMirrorTextToBlocks.COLOR.VARIABLES);
        this.initialized_ = true;
        this.updateShape_();
    },
    /**
     * Create XML to represent list inputs.
     * @return {!Element} XML storage element.
     * @this Blockly.Block
     */
    mutationToDom: function () {
        let container = document.createElement('mutation');
        container.setAttribute('initialized', this.initialized_);
        return container;
    },
    /**
     * Parse XML to restore the list inputs.
     * @param {!Element} xmlElement XML storage element.
     * @this Blockly.Block
     */
    domToMutation: function (xmlElement) {
        this.initialized_ = "true" === xmlElement.getAttribute('initialized');
        this.updateShape_();
    },
    updateShape_: function (block) {
        // Add new inputs.
        if (this.initialized_ && !this.getInput('VALUE')) {
            this.appendValueInput('VALUE')
                .appendField('=')
                .setAlign(Blockly.inputs.Align.RIGHT);
        }
        if (!this.initialized_ && this.getInput('VALUE')) {
            this.removeInput('VALUE');
        }
    }
};

BlockMirrorTextToBlocks.ANNOTATION_OPTIONS = [
    ["int", "int"],
    ["float", "float"],
    ["str", "str"],
    ["bool", "bool"],
    ["None", "None"]
];

BlockMirrorTextToBlocks.ANNOTATION_GENERATE = {};
BlockMirrorTextToBlocks.ANNOTATION_OPTIONS.forEach(function (ann) {
    BlockMirrorTextToBlocks.ANNOTATION_GENERATE[ann[1]] = ann[0];
});

Blockly.Blocks['ast_AnnAssign'] = {
    init: function () {
        this.appendDummyInput()
            .appendField("set")
            .appendField(new Blockly.FieldVariable("item"), "TARGET")
            .appendField(":")
            .appendField(new Blockly.FieldDropdown(BlockMirrorTextToBlocks.ANNOTATION_OPTIONS), "ANNOTATION");
        this.appendValueInput("VALUE")
            .setCheck(null)
            .appendField("=");
        this.setInputsInline(true);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(BlockMirrorTextToBlocks.COLOR.VARIABLES);
        this.strAnnotations_ = false;
        this.initialized_ = true;
    },
    /**
     * Create XML to represent list inputs.
     * @return {!Element} XML storage element.
     * @this Blockly.Block
     */
    mutationToDom: function () {
        let container = document.createElement('mutation');
        container.setAttribute('str', this.strAnnotations_);
        container.setAttribute('initialized', this.initialized_);
        return container;
    },
    /**
     * Parse XML to restore the list inputs.
     * @param {!Element} xmlElement XML storage element.
     * @this Blockly.Block
     */
    domToMutation: function (xmlElement) {
        this.strAnnotations_ = "true" === xmlElement.getAttribute('str');
        this.initialized_ = "true" === xmlElement.getAttribute('initialized');
        this.updateShape_();
    },
    updateShape_: function (block) {
        // Add new inputs.
        if (this.initialized_ && !this.getInput('VALUE')) {
            this.appendValueInput('VALUE')
                .appendField('=')
                .setAlign(Blockly.inputs.Align.RIGHT);
        }
        if (!this.initialized_ && this.getInput('VALUE')) {
            this.removeInput('VALUE');
        }
    }
};

python.pythonGenerator.forBlock['ast_AnnAssignFull'] = function(block, generator) {
    // Create a list with any number of elements of any type.
    let target = python.pythonGenerator.valueToCode(block, 'TARGET',
        python.pythonGenerator.ORDER_NONE) || python.pythonGenerator.blank;
    let annotation = python.pythonGenerator.valueToCode(block, 'ANNOTATION',
        python.pythonGenerator.ORDER_NONE) || python.pythonGenerator.blank;
    let value = "";
    if (this.initialized_) {
        value = " = " + python.pythonGenerator.valueToCode(block, 'VALUE',
            python.pythonGenerator.ORDER_NONE) || python.pythonGenerator.blank;
    }
    return target + ": " + annotation + value + "\n";
};

python.pythonGenerator.forBlock['ast_AnnAssign'] = function(block, generator) {
    // Create a list with any number of elements of any type.
    var target = python.pythonGenerator.getVariableName(block.getFieldValue('TARGET'),
        Blockly.Variables.NAME_TYPE);
    let annotation = block.getFieldValue('ANNOTATION');
    if (block.strAnnotations_) {
        annotation = python.pythonGenerator.quote_(annotation);
    }
    let value = "";
    if (this.initialized_) {
        value = " = " + python.pythonGenerator.valueToCode(block, 'VALUE',
            python.pythonGenerator.ORDER_NONE) || python.pythonGenerator.blank;
    }
    return target + ": " + annotation + value + "\n";
};

BlockMirrorTextToBlocks.prototype.getBuiltinAnnotation = function (annotation) {
    let result = false;
    // Can we turn it into a basic type?
    if (annotation._astname === 'Name') {
        result = Sk.ffi.remapToJs(annotation.id);
    } else if (annotation._astname === 'Str') {
        result = Sk.ffi.remapToJs(annotation.s);
    }

    // Potentially filter out unknown annotations
    if (result !== false && this.strictAnnotations) {
        if (this.strictAnnotations.indexOf(result) !== -1) {
            return result;
        } else {
            return false;
        }
    } else {
        return result;
    }
}

BlockMirrorTextToBlocks.prototype['ast_AnnAssign'] = function (node, parent) {
    let target = node.target;
    let annotation = node.annotation;
    let value = node.value;

    let values = {};
    let mutations = {'@initialized': false};
    if (value !== null) {
        values['VALUE'] = this.convert(value, node);
        mutations['@initialized'] = true;
    }

    // TODO: This controls whether the annotation is stored in __annotations__
    let simple = node.simple;

    let builtinAnnotation = this.getBuiltinAnnotation(annotation);

    if (target._astname === 'Name' && target.id.v !== python.pythonGenerator.blank && builtinAnnotation !== false) {
        mutations['@str'] = annotation._astname === 'Str'
        return BlockMirrorTextToBlocks.create_block("ast_AnnAssign", node.lineno, {
                'TARGET': target.id.v,
                'ANNOTATION': builtinAnnotation,
            },
            values,
            {
                "inline": "true",
            }, mutations);
    } else {
        values['TARGET'] = this.convert(target, node);
        values['ANNOTATION'] = this.convert(annotation, node);
        return BlockMirrorTextToBlocks.create_block("ast_AnnAssignFull", node.lineno, {},
            values,
            {
                "inline": "true",
            }, mutations);
    }
};BlockMirrorTextToBlocks.BLOCKS.push({
    "type": "ast_AssertFull",
    "message0": "assert %1 %2",
    "args0": [
        {"type": "input_value", "name": "TEST"},
        {"type": "input_value", "name": "MSG"}
    ],
    "inputsInline": true,
    "previousStatement": null,
    "nextStatement": null,
    "colour": BlockMirrorTextToBlocks.COLOR.LOGIC,
});

BlockMirrorTextToBlocks.BLOCKS.push({
    "type": "ast_Assert",
    "message0": "assert %1",
    "args0": [
        {"type": "input_value", "name": "TEST"}
    ],
    "inputsInline": true,
    "previousStatement": null,
    "nextStatement": null,
    "colour": BlockMirrorTextToBlocks.COLOR.LOGIC,
});

python.pythonGenerator.forBlock['ast_Assert'] = function(block, generator) {
    var test = python.pythonGenerator.valueToCode(block, 'TEST', python.pythonGenerator.ORDER_ATOMIC) || python.pythonGenerator.blank;
    return "assert " + test + "\n";
};

python.pythonGenerator.forBlock['ast_AssertFull'] = function(block, generator) {
    var test = python.pythonGenerator.valueToCode(block, 'TEST', python.pythonGenerator.ORDER_ATOMIC) || python.pythonGenerator.blank;
    var msg = python.pythonGenerator.valueToCode(block, 'MSG', python.pythonGenerator.ORDER_ATOMIC) || python.pythonGenerator.blank;
    return "assert " + test + ", "+msg+"\n";
};

BlockMirrorTextToBlocks.prototype['ast_Assert'] = function (node, parent) {
    var test = node.test;
    var msg = node.msg;
    if (msg == null) {
        return BlockMirrorTextToBlocks.create_block("ast_Assert", node.lineno, {}, {
            "TEST": this.convert(test, node)
        });
    } else {
        return BlockMirrorTextToBlocks.create_block("ast_AssertFull", node.lineno, {}, {
            "TEST": this.convert(test, node),
            "MSG": this.convert(msg, node)
        });
    }
};Blockly.Blocks['ast_Assign'] = {
    init: function () {
        this.setInputsInline(true);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(BlockMirrorTextToBlocks.COLOR.VARIABLES);
        this.targetCount_ = 1;
        this.simpleTarget_ = true;
        this.updateShape_();
        Blockly.Extensions.apply("contextMenu_variableSetterGetter", this, false);
    },
    updateShape_: function () {
        if (!this.getInput('VALUE')) {
            this.appendDummyInput()
                .appendField("set");
            this.appendValueInput('VALUE')
                .appendField('=');
        }
        let i = 0;
        if (this.targetCount_ === 1 && this.simpleTarget_) {
            this.setInputsInline(true);
            if (!this.getInput('VAR_ANCHOR')) {
                this.appendDummyInput('VAR_ANCHOR')
                    .appendField(new Blockly.FieldVariable("variable"), "VAR");
            }
            this.moveInputBefore('VAR_ANCHOR', 'VALUE');
        } else {
            this.setInputsInline(true);
            // Add new inputs.
            for (; i < this.targetCount_; i++) {
                if (!this.getInput('TARGET' + i)) {
                    var input = this.appendValueInput('TARGET' + i);
                    if (i !== 0) {
                        input.appendField('and').setAlign(Blockly.inputs.Align.RIGHT);
                    }
                }
                this.moveInputBefore('TARGET' + i, 'VALUE');
            }
            // Kill simple VAR
            if (this.getInput('VAR_ANCHOR')) {
                this.removeInput('VAR_ANCHOR');
            }
        }
        // Remove deleted inputs.
        while (this.getInput('TARGET' + i)) {
            this.removeInput('TARGET' + i);
            i++;
        }
    },
    /**
     * Create XML to represent list inputs.
     * @return {!Element} XML storage element.
     * @this Blockly.Block
     */
    mutationToDom: function () {
        var container = document.createElement('mutation');
        container.setAttribute('targets', this.targetCount_);
        container.setAttribute('simple', this.simpleTarget_);
        return container;
    },
    /**
     * Parse XML to restore the list inputs.
     * @param {!Element} xmlElement XML storage element.
     * @this Blockly.Block
     */
    domToMutation: function (xmlElement) {
        this.targetCount_ = parseInt(xmlElement.getAttribute('targets'), 10);
        this.simpleTarget_ = "true" === xmlElement.getAttribute('simple');
        this.updateShape_();
    },
};

python.pythonGenerator.forBlock['ast_Assign'] = function(block, generator) {
    // Create a list with any number of elements of any type.
    let value = python.pythonGenerator.valueToCode(block, 'VALUE',
        python.pythonGenerator.ORDER_NONE) || python.pythonGenerator.blank;
    let targets = new Array(block.targetCount_);
    if (block.targetCount_ === 1 && block.simpleTarget_) {
        targets[0] = python.pythonGenerator.getVariableName(block.getFieldValue('VAR'), Blockly.Variables.NAME_TYPE);
    } else {
        for (var i = 0; i < block.targetCount_; i++) {
            targets[i] = (python.pythonGenerator.valueToCode(block, 'TARGET' + i,
                python.pythonGenerator.ORDER_NONE) || python.pythonGenerator.blank);
        }
    }
    return targets.join(' = ') + " = " + value + "\n";
};

BlockMirrorTextToBlocks.prototype['ast_Assign'] = function (node, parent) {
    let targets = node.targets;
    let value = node.value;

    let values;
    let fields = {};
    let simpleTarget = (targets.length === 1 && targets[0]._astname === 'Name');
    if (simpleTarget) {
        values = {};
        fields['VAR'] = Sk.ffi.remapToJs(targets[0].id);
    } else {
        values = this.convertElements("TARGET", targets, node);
    }
    values['VALUE'] = this.convert(value, node);

    return BlockMirrorTextToBlocks.create_block("ast_Assign", node.lineno, fields,
        values,
        {
            "inline": "true",
        }, {
            "@targets": targets.length,
            "@simple": simpleTarget
        });
};BlockMirrorTextToBlocks.BLOCKS.push({
    "type": "ast_AttributeFull",
    "lastDummyAlign0": "RIGHT",
    "message0": "%1 . %2",
    "args0": [
        {"type": "input_value", "name": "VALUE"},
        {"type": "field_input", "name": "ATTR", "text": "default"}
    ],
    "inputsInline": true,
    "output": null,
    "colour": BlockMirrorTextToBlocks.COLOR.OO,
});

BlockMirrorTextToBlocks.BLOCKS.push({
    "type": "ast_Attribute",
    "message0": "%1 . %2",
    "args0": [
        {"type": "field_variable", "name": "VALUE", "variable": "variable"},
        {"type": "field_input", "name": "ATTR", "text": "attribute"}
    ],
    "inputsInline": true,
    "output": null,
    "colour": BlockMirrorTextToBlocks.COLOR.OO,
});

python.pythonGenerator.forBlock['ast_Attribute'] = function(block, generator) {
    // Text value.
    var value = python.pythonGenerator.getVariableName(block.getFieldValue('VALUE'),
        Blockly.Variables.NAME_TYPE);
    var attr = block.getFieldValue('ATTR');
    let code = value + "." + attr;
    return [code, python.pythonGenerator.ORDER_MEMBER];
};

python.pythonGenerator.forBlock['ast_AttributeFull'] = function(block, generator) {
    // Text value.
    var value = python.pythonGenerator.valueToCode(block, 'VALUE', python.pythonGenerator.ORDER_NONE) || python.pythonGenerator.blank;
    var attr = block.getFieldValue('ATTR');
    let code = value + "." + attr;
    return [code, python.pythonGenerator.ORDER_MEMBER];
};

BlockMirrorTextToBlocks.prototype['ast_Attribute'] = function (node, parent) {
    let value = node.value;
    let attr = node.attr;

    //if (value.constructor)
    if (value._astname == "Name") {
        return BlockMirrorTextToBlocks.create_block("ast_Attribute", node.lineno, {
            "VALUE": Sk.ffi.remapToJs(value.id),
            "ATTR": Sk.ffi.remapToJs(attr)
        },);
    } else {
        return BlockMirrorTextToBlocks.create_block("ast_AttributeFull", node.lineno, {
            "ATTR": Sk.ffi.remapToJs(attr)
        }, {
            "VALUE": this.convert(value, node)
        });
    }
}
Blockly.Blocks['ast_AugAssign'] = {
    init: function () {
        let block = this;
        this.simpleTarget_ = true;
        this.allOptions_ = false;
        this.initialPreposition_ = "by";
        this.appendDummyInput("OP")
            .appendField(new Blockly.FieldDropdown(function () {
                return block.allOptions_ ?
                    BlockMirrorTextToBlocks.BINOPS_AUGASSIGN_DISPLAY_FULL :
                    BlockMirrorTextToBlocks.BINOPS_AUGASSIGN_DISPLAY
            }, function (value) {
                let block = this.sourceBlock_;
                block.updatePreposition_(value);
            }), "OP_NAME")
            .appendField(" ");
        this.appendDummyInput('PREPOSITION_ANCHOR')
            .setAlign(Blockly.inputs.Align.RIGHT)
            .appendField("by", 'PREPOSITION');
        this.appendValueInput('VALUE');
        this.setInputsInline(true);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(BlockMirrorTextToBlocks.COLOR.VARIABLES);
        this.updateShape_();
        this.updatePreposition_(this.initialPreposition_);
    },

    updatePreposition_: function(value) {
        let preposition = BlockMirrorTextToBlocks.BINOPS_AUGASSIGN_PREPOSITION[value];
        this.setFieldValue(preposition, 'PREPOSITION')
    },
    /**
     * Create XML to represent list inputs.
     * @return {!Element} XML storage element.
     * @this Blockly.Block
     */
    mutationToDom: function () {
        let container = document.createElement('mutation');
        container.setAttribute('simple', this.simpleTarget_);
        container.setAttribute('options', this.allOptions_);
        container.setAttribute('preposition', this.initialPreposition_);
        return container;
    },
    /**
     * Parse XML to restore the list inputs.
     * @param {!Element} xmlElement XML storage element.
     * @this Blockly.Block
     */
    domToMutation: function (xmlElement) {
        this.simpleTarget_ = "true" === xmlElement.getAttribute('simple');
        this.allOptions_ = "true" === xmlElement.getAttribute('options');
        this.initialPreposition_ = xmlElement.getAttribute('preposition');
        this.updateShape_();
        this.updatePreposition_(this.initialPreposition_);
    },
    updateShape_: function (block) {
        // Add new inputs.
        this.getField("OP_NAME").getOptions(false);
        if (this.simpleTarget_) {
            if (!this.getInput('VAR_ANCHOR')) {
                this.appendDummyInput('VAR_ANCHOR')
                    .appendField(new Blockly.FieldVariable("variable"), "VAR");
                this.moveInputBefore('VAR_ANCHOR', 'PREPOSITION_ANCHOR')
            }
            if (this.getInput('TARGET')) {
                this.removeInput('TARGET');
            }
        } else {
            if (this.getInput('VAR_ANCHOR')) {
                this.removeInput('VAR_ANCHOR');
            }
            if (!this.getInput('TARGET')) {
                this.appendValueInput('TARGET');
                this.moveInputBefore('TARGET', 'PREPOSITION_ANCHOR')
            }
        }
    }
};

python.pythonGenerator.forBlock['ast_AugAssign'] = function(block, generator) {
    // Create a list with any number of elements of any type.
    let target;
    if (block.simpleTarget_) {
        target = python.pythonGenerator.getVariableName(block.getFieldValue('VAR'),
            Blockly.Variables.NAME_TYPE);
    } else {
        target = python.pythonGenerator.valueToCode(block, 'TARGET',
            python.pythonGenerator.ORDER_NONE) || python.pythonGenerator.blank;
    }

    let operator = BINOPS_BLOCKLY_GENERATE[block.getFieldValue('OP_NAME')][0];

    let value = python.pythonGenerator.valueToCode(block, 'VALUE',
        python.pythonGenerator.ORDER_NONE) || python.pythonGenerator.blank;
    return target + operator + "= " + value + "\n";
};


BlockMirrorTextToBlocks.prototype['ast_AugAssign'] = function (node, parent) {
    let target = node.target;
    let op = node.op.name;
    let value = node.value;

    let values = {'VALUE': this.convert(value, node)};
    let fields = {'OP_NAME': op};
    let simpleTarget = target._astname === 'Name';
    if (simpleTarget) {
        fields['VAR'] = Sk.ffi.remapToJs(target.id);
    } else {
        values['TARGET'] = this.convert(value, node);
    }

    let preposition = op;

    let allOptions = BINOPS_SIMPLE.indexOf(op) === -1;

    return BlockMirrorTextToBlocks.create_block("ast_AugAssign", node.lineno, fields,
        values,
        {
            "inline": "true",
        }, {
            "@options": allOptions,
            "@simple": simpleTarget,
            "@preposition": preposition
        });
};
BlockMirrorTextToBlocks.BINOPS = [
    ["+", "Add", python.pythonGenerator.ORDER_ADDITIVE, 'Return the sum of the two numbers.', 'increase', 'by'],
    ["-", "Sub", python.pythonGenerator.ORDER_ADDITIVE, 'Return the difference of the two numbers.', 'decrease', 'by'],
    ["*", "Mult", python.pythonGenerator.ORDER_MULTIPLICATIVE, 'Return the product of the two numbers.', 'multiply', 'by'],
    ["/", "Div", python.pythonGenerator.ORDER_MULTIPLICATIVE, 'Return the quotient of the two numbers.', 'divide', 'by'],
    ["%", "Mod", python.pythonGenerator.ORDER_MULTIPLICATIVE, 'Return the remainder of the first number divided by the second number.',
    'modulo', 'by'],
    ["**", "Pow", python.pythonGenerator.ORDER_EXPONENTIATION, 'Return the first number raised to the power of the second number.',
    'raise', 'to'],
    ["//", "FloorDiv", python.pythonGenerator.ORDER_MULTIPLICATIVE, 'Return the truncated quotient of the two numbers.',
    'floor divide', 'by'],
    ["<<", "LShift", python.pythonGenerator.ORDER_BITWISE_SHIFT, 'Return the left number left shifted by the right number.',
    'left shift', 'by'],
    [">>", "RShift", python.pythonGenerator.ORDER_BITWISE_SHIFT, 'Return the left number right shifted by the right number.',
    'right shift', 'by'],
    ["|", "BitOr", python.pythonGenerator.ORDER_BITWISE_OR, 'Returns the bitwise OR of the two values.',
    'bitwise OR', 'using'],
    ["^", "BitXor", python.pythonGenerator.ORDER_BITWISE_XOR, 'Returns the bitwise XOR of the two values.',
    'bitwise XOR', 'using'],
    ["&", "BitAnd", python.pythonGenerator.ORDER_BITWISE_AND, 'Returns the bitwise AND of the two values.',
    'bitwise AND', 'using'],
    ["@", "MatMult", python.pythonGenerator.ORDER_MULTIPLICATIVE, 'Return the matrix multiplication of the two numbers.',
    'matrix multiply', 'by']
];
var BINOPS_SIMPLE = ['Add', 'Sub', 'Mult', 'Div', 'Mod', 'Pow'];
var BINOPS_BLOCKLY_DISPLAY_FULL = BlockMirrorTextToBlocks.BINOPS.map(
    binop => [binop[0], binop[1]]
);
var BINOPS_BLOCKLY_DISPLAY = BINOPS_BLOCKLY_DISPLAY_FULL.filter(
    binop => BINOPS_SIMPLE.indexOf(binop[1]) >= 0
);
BlockMirrorTextToBlocks.BINOPS_AUGASSIGN_DISPLAY_FULL =BlockMirrorTextToBlocks.BINOPS.map(
    binop => [binop[4], binop[1]]
);
BlockMirrorTextToBlocks.BINOPS_AUGASSIGN_DISPLAY = BlockMirrorTextToBlocks.BINOPS_AUGASSIGN_DISPLAY_FULL.filter(
    binop => BINOPS_SIMPLE.indexOf(binop[1]) >= 0
);

var BINOPS_BLOCKLY_GENERATE = {};
BlockMirrorTextToBlocks.BINOPS_AUGASSIGN_PREPOSITION = {};
BlockMirrorTextToBlocks.BINOPS.forEach(function (binop) {
    BINOPS_BLOCKLY_GENERATE[binop[1]] = [" " + binop[0], binop[2]];
    BlockMirrorTextToBlocks.BINOPS_AUGASSIGN_PREPOSITION[binop[1]] = binop[5];
    //Blockly.Constants.Math.TOOLTIPS_BY_OP[binop[1]] = binop[3];
});

BlockMirrorTextToBlocks.BLOCKS.push({
    "type": "ast_BinOpFull",
    "message0": "%1 %2 %3",
    "args0": [
        {"type": "input_value", "name": "A"},
        {"type": "field_dropdown", "name": "OP", "options": BINOPS_BLOCKLY_DISPLAY_FULL},
        {"type": "input_value", "name": "B"}
    ],
    "inputsInline": true,
    "output": null,
    "colour": BlockMirrorTextToBlocks.COLOR.MATH
    //"extensions": ["math_op_tooltip"]
});

BlockMirrorTextToBlocks.BLOCKS.push({
    "type": "ast_BinOp",
    "message0": "%1 %2 %3",
    "args0": [
        {"type": "input_value", "name": "A"},
        {"type": "field_dropdown", "name": "OP", "options": BINOPS_BLOCKLY_DISPLAY},
        {"type": "input_value", "name": "B"}
    ],
    "inputsInline": true,
    "output": null,
    "colour": BlockMirrorTextToBlocks.COLOR.MATH
    //"extensions": ["math_op_tooltip"]
});

python.pythonGenerator.forBlock['ast_BinOp'] = function(block, generator) {
    // Basic arithmetic operators, and power.
    var tuple = BINOPS_BLOCKLY_GENERATE[block.getFieldValue('OP')];
    var operator = tuple[0]+" ";
    var order = tuple[1];
    var argument0 = python.pythonGenerator.valueToCode(block, 'A', order) || python.pythonGenerator.blank;
    var argument1 = python.pythonGenerator.valueToCode(block, 'B', order) || python.pythonGenerator.blank;
    var code = argument0 + operator + argument1;
    return [code, order];
};

BlockMirrorTextToBlocks.prototype['ast_BinOp'] = function (node, parent) {
    let left = node.left;
    let op = node.op.name;
    let right = node.right;

    let blockName = (BINOPS_SIMPLE.indexOf(op) >= 0) ? "ast_BinOp" : 'ast_BinOpFull';

    return BlockMirrorTextToBlocks.create_block(blockName, node.lineno, {
        "OP": op
    }, {
        "A": this.convert(left, node),
        "B": this.convert(right, node)
    }, {
        "inline": true
    });
}

python.pythonGenerator.forBlock['ast_BinOpFull'] = python.pythonGenerator.forBlock['ast_BinOp'];
BlockMirrorTextToBlocks.prototype['ast_BinOpFull'] = BlockMirrorTextToBlocks.prototype['ast_BinOp'];
BlockMirrorTextToBlocks.BOOLOPS = [
    ["and", "And", python.pythonGenerator.ORDER_LOGICAL_AND, 'Return whether the left and right both evaluate to True.'],
    ["or", "Or", python.pythonGenerator.ORDER_LOGICAL_OR, 'Return whether either the left or right evaluate to True.']
];
var BOOLOPS_BLOCKLY_DISPLAY = BlockMirrorTextToBlocks.BOOLOPS.map(
    boolop => [boolop[0], boolop[1]]
);
var BOOLOPS_BLOCKLY_GENERATE = {};
BlockMirrorTextToBlocks.BOOLOPS.forEach(function (boolop) {
    BOOLOPS_BLOCKLY_GENERATE[boolop[1]] = [" " + boolop[0] + " ", boolop[2]];
});

BlockMirrorTextToBlocks.BLOCKS.push({
    "type": "ast_BoolOp",
    "message0": "%1 %2 %3",
    "args0": [
        {"type": "input_value", "name": "A"},
        {"type": "field_dropdown", "name": "OP", "options": BOOLOPS_BLOCKLY_DISPLAY},
        {"type": "input_value", "name": "B"}
    ],
    "inputsInline": true,
    "output": null,
    "colour": BlockMirrorTextToBlocks.COLOR.LOGIC
});

python.pythonGenerator.forBlock['ast_BoolOp'] = function(block, generator) {
    // Operations 'and', 'or'.
    var operator = (block.getFieldValue('OP') === 'And') ? 'and' : 'or';
    var order = (operator === 'and') ? python.pythonGenerator.ORDER_LOGICAL_AND :
        python.pythonGenerator.ORDER_LOGICAL_OR;
    var argument0 = python.pythonGenerator.valueToCode(block, 'A', order) || python.pythonGenerator.blank;
    var argument1 = python.pythonGenerator.valueToCode(block, 'B', order) || python.pythonGenerator.blank;
    var code = argument0 + ' ' + operator + ' ' + argument1;
    return [code, order];
};

BlockMirrorTextToBlocks.prototype['ast_BoolOp'] = function (node, parent) {
    var op = node.op;
    var values = node.values;
    var result_block = this.convert(values[0], node);
    for (var i = 1; i < values.length; i += 1) {
        result_block = BlockMirrorTextToBlocks.create_block("ast_BoolOp", node.lineno, {
            "OP": op.name
        }, {
            "A": result_block,
            "B": this.convert(values[i], node)
        }, {
            "inline": "true"
        });
    }
    return result_block;
};


BlockMirrorTextToBlocks.BLOCKS.push({
    "type": "ast_Break",
    "message0": "break",
    "inputsInline": false,
    "previousStatement": null,
    "nextStatement": null,
    "colour": BlockMirrorTextToBlocks.COLOR.CONTROL,
});

python.pythonGenerator.forBlock['ast_Break'] = function(block, generator) {
    return "break\n";
};

BlockMirrorTextToBlocks.prototype['ast_Break'] = function (node, parent) {
    return BlockMirrorTextToBlocks.create_block("ast_Break", node.lineno);
};// TODO: Support stuff like "append" where the message is after the value input
// TODO: Handle updating function/method definition -> update call
// TODO: Do a pretraversal to determine if a given function returns

Blockly.Blocks['ast_Call'] = {
    /**
     * Block for calling a procedure with no return value.
     * @this Blockly.Block
     */
    init: function () {
        this.givenColour_ = BlockMirrorTextToBlocks.COLOR.FUNCTIONS
        this.setInputsInline(true);
        // Regular ('NAME') or Keyword (either '**' or '*NAME')
        this.arguments_ = [];
        this.argumentVarModels_ = [];
        // acbart: Added count to keep track of unused parameters
        this.argumentCount_ = 0;
        this.quarkConnections_ = {};
        this.quarkIds_ = null;
        // acbart: Show parameter names, if they exist
        this.showParameterNames_ = false;
        // acbart: Whether this block returns
        this.returns_ = true;
        // acbart: added simpleName to handle complex function calls (e.g., chained)
        this.isMethod_ = false;
        this.name_ = null;
        this.message_ = "function";
        this.premessage_ = "";
        this.module_ = "";
        this.updateShape_();
    },

    /**
     * Returns the name of the procedure this block calls.
     * @return {string} Procedure name.
     * @this Blockly.Block
     */
    getProcedureCall: function () {
        return this.name_;
    },
    /**
     * Notification that a procedure is renaming.
     * If the name matches this block's procedure, rename it.
     * Also rename if it was previously null.
     * @param {string} oldName Previous name of procedure.
     * @param {string} newName Renamed procedure.
     * @this Blockly.Block
     */
    renameProcedure: function (oldName, newName) {
        if (this.name_ === null ||
            Blockly.Names.equals(oldName, this.name_)) {
            this.name_ = newName;
            this.updateShape_();
        }
    },
    /**
     * Notification that the procedure's parameters have changed.
     * @param {!Array.<string>} paramNames New param names, e.g. ['x', 'y', 'z'].
     * @param {!Array.<string>} paramIds IDs of params (consistent for each
     *     parameter through the life of a mutator, regardless of param renaming),
     *     e.g. ['piua', 'f8b_', 'oi.o'].
     * @private
     * @this Blockly.Block
     */
    setProcedureParameters_: function (paramNames, paramIds) {
        // Data structures:
        // this.arguments = ['x', 'y']
        //     Existing param names.
        // this.quarkConnections_ {piua: null, f8b_: Blockly.Connection}
        //     Look-up of paramIds to connections plugged into the call block.
        // this.quarkIds_ = ['piua', 'f8b_']
        //     Existing param IDs.
        // Note that quarkConnections_ may include IDs that no longer exist, but
        // which might reappear if a param is reattached in the mutator.
        var defBlock = Blockly.Procedures.getDefinition(this.getProcedureCall(),
            this.workspace);
        var mutatorOpen = defBlock && defBlock.mutator &&
            defBlock.mutator.isVisible();
        if (!mutatorOpen) {
            this.quarkConnections_ = {};
            this.quarkIds_ = null;
        }
        if (!paramIds) {
            // Reset the quarks (a mutator is about to open).
            return false;
        }
        // Test arguments (arrays of strings) for changes. '\n' is not a valid
        // argument name character, so it is a valid delimiter here.
        if (paramNames.join('\n') == this.arguments_.join('\n')) {
            // No change.
            this.quarkIds_ = paramIds;
            return false;
        }
        if (paramIds.length !== paramNames.length) {
            throw RangeError('paramNames and paramIds must be the same length.');
        }
        this.setCollapsed(false);
        if (!this.quarkIds_) {
            // Initialize tracking for this block.
            this.quarkConnections_ = {};
            this.quarkIds_ = [];
        }
        // Switch off rendering while the block is rebuilt.
        var savedRendered = this.rendered;
        this.rendered = false;
        // Update the quarkConnections_ with existing connections.
        for (let i = 0; i < this.arguments_.length; i++) {
            var input = this.getInput('ARG' + i);
            if (input) {
                let connection = input.connection.targetConnection;
                this.quarkConnections_[this.quarkIds_[i]] = connection;
                if (mutatorOpen && connection &&
                    paramIds.indexOf(this.quarkIds_[i]) === -1) {
                    // This connection should no longer be attached to this block.
                    connection.disconnect();
                    connection.getSourceBlock().bumpNeighbours_();
                }
            }
        }
        // Rebuild the block's arguments.
        this.arguments_ = [].concat(paramNames);
        this.argumentCount_ = this.arguments_.length;
        // And rebuild the argument model list.
        this.argumentVarModels_ = [];
        /*
        // acbart: Function calls don't create variables, what do they know?
        for (let i = 0; i < this.arguments_.length; i++) {
            let argumentName = this.arguments_[i];
            var variable = Blockly.Variables.getVariable(
                this.workspace, null, this.arguments_[i], '');
            if (variable) {
                this.argumentVarModels_.push(variable);
            }
        }*/

        this.updateShape_();
        this.quarkIds_ = paramIds;
        // Reconnect any child blocks.
        if (this.quarkIds_) {
            for (let i = 0; i < this.arguments_.length; i++) {
                var quarkId = this.quarkIds_[i];
                if (quarkId in this.quarkConnections_) {
                    let connection = this.quarkConnections_[quarkId];
                    if (!connection?.reconnect(this, 'ARG' + i)) {
                        // Block no longer exists or has been attached elsewhere.
                        delete this.quarkConnections_[quarkId];
                    }
                }
            }
        }
        // Restore rendering and show the changes.
        this.rendered = savedRendered;
        if (this.rendered) {
            this.render();
        }
        return true;
    },
    /**
     * Modify this block to have the correct number of arguments.
     * @private
     * @this Blockly.Block
     */
    updateShape_: function () {
        // If it's a method, add in the caller
        if (this.isMethod_ && !this.getInput('FUNC')) {
            let func = this.appendValueInput('FUNC');
            // If there's a premessage, add it in
            if (this.premessage_ !== "") {
                func.appendField(this.premessage_);
            }
        } else if (!this.isMethod_ && this.getInput('FUNC')) {
            this.removeInput('FUNC');
        }

        let drawnArgumentCount = this.getDrawnArgumentCount_();
        let message = this.getInput('MESSAGE_AREA')
        // Zero arguments, just do {message()}
        if (drawnArgumentCount === 0) {
            if (message) {
                message.removeField('MESSAGE');
            } else {
                message = this.appendDummyInput('MESSAGE_AREA')
                    .setAlign(Blockly.inputs.Align.RIGHT);
            }
            message.appendField(new Blockly.FieldLabel(this.message_ + "\ ("), 'MESSAGE');
            // One argument, no MESSAGE_AREA
        } else if (message) {
            this.removeInput('MESSAGE_AREA');
        }
        // Process arguments
        let i;
        for (i = 0; i < drawnArgumentCount; i++) {
            let argument = this.arguments_[i];
            let argumentName = this.parseArgument_(argument);
            if (i === 0) {
                argumentName = this.message_ + "\ (" + argumentName;
            }
            let field = this.getField('ARGNAME' + i);
            if (field) {
                // Ensure argument name is up to date.
                // The argument name field is deterministic based on the mutation,
                // no need to fire a change event.
                Blockly.Events.disable();
                try {
                    field.setValue(argumentName);
                } finally {
                    Blockly.Events.enable();
                }
            } else {
                // Add new input.
                field = new Blockly.FieldLabel(argumentName);
                this.appendValueInput('ARG' + i)
                    .setAlign(Blockly.inputs.Align.RIGHT)
                    .appendField(field, 'ARGNAME' + i)
                    .init();
            }
            if (argumentName) {
                field.setVisible(true);
            } else {
                field.setVisible(false);
            }
        }

        // Closing parentheses
        if (!this.getInput('CLOSE_PAREN')) {
            this.appendDummyInput('CLOSE_PAREN')
                .setAlign(Blockly.inputs.Align.RIGHT)
                .appendField(new Blockly.FieldLabel(")"));
        }

        // Move everything into place
        if (drawnArgumentCount === 0) {
            if (this.isMethod_) {
                this.moveInputBefore('FUNC', 'MESSAGE_AREA');
            }
            this.moveInputBefore('MESSAGE_AREA', 'CLOSE_PAREN');
        } else {
            if (this.isMethod_) {
                this.moveInputBefore('FUNC', 'CLOSE_PAREN');
            }
        }
        for (let j = 0; j < i; j++) {
            this.moveInputBefore('ARG' + j, 'CLOSE_PAREN')
        }

        // Set return state
        this.setReturn_(this.returns_, false);
        // Remove deleted inputs.
        while (this.getInput('ARG' + i)) {
            this.removeInput('ARG' + i);
            i++;
        }

        this.setColour(this.givenColour_);
    }
    ,
    /**
     * Create XML to represent the (non-editable) name and arguments.
     * @return {!Element} XML storage element.
     * @this Blockly.Block
     */
    mutationToDom: function () {
        var container = document.createElement('mutation');
        let name = this.getProcedureCall();
        container.setAttribute('name', name === null ? '*' : name);
        container.setAttribute('arguments', this.argumentCount_);
        container.setAttribute('returns', this.returns_);
        container.setAttribute('parameters', this.showParameterNames_);
        container.setAttribute('method', this.isMethod_);
        container.setAttribute('message', this.message_);
        container.setAttribute('premessage', this.premessage_);
        container.setAttribute('module', this.module_);
        container.setAttribute('colour', this.givenColour_);
        for (var i = 0; i < this.arguments_.length; i++) {
            var parameter = document.createElement('arg');
            parameter.setAttribute('name', this.arguments_[i]);
            container.appendChild(parameter);
        }
        return container;
    },
    /**
     * Parse XML to restore the (non-editable) name and parameters.
     * @param {!Element} xmlElement XML storage element.
     * @this Blockly.Block
     */
    domToMutation: function (xmlElement) {
        this.name_ = xmlElement.getAttribute('name');
        this.name_ = this.name_ === '*' ? null : this.name_;
        this.argumentCount_ = parseInt(xmlElement.getAttribute('arguments'), 10);
        this.showParameterNames_ = "true" === xmlElement.getAttribute('parameters');
        this.returns_ = "true" === xmlElement.getAttribute('returns');
        this.isMethod_ = "true" === xmlElement.getAttribute('method');
        this.message_ = xmlElement.getAttribute('message');
        this.premessage_ = xmlElement.getAttribute('premessage');
        this.module_ = xmlElement.getAttribute('module');
        this.givenColour_ = parseInt(xmlElement.getAttribute('colour'), 10);

        var args = [];
        var paramIds = [];
        for (var i = 0, childNode; childNode = xmlElement.childNodes[i]; i++) {
            if (childNode.nodeName.toLowerCase() === 'arg') {
                args.push(childNode.getAttribute('name'));
                paramIds.push(childNode.getAttribute('paramId'));
            }
        }
        let result = this.setProcedureParameters_(args, paramIds);
        if (!result) {
            this.updateShape_();
        }
        if (this.name_ !== null) {
            this.renameProcedure(this.getProcedureCall(), this.name_);
        }
    },
    /**
     * Return all variables referenced by this block.
     * @return {!Array.<!Blockly.VariableModel>} List of variable models.
     * @this Blockly.Block
     */
    getVarModels: function () {
        return this.argumentVarModels_;
    }
    ,
    /**
     * Add menu option to find the definition block for this call.
     * @param {!Array} options List of menu options to add to.
     * @this Blockly.Block
     */
    customContextMenu: function (options) {
        if (!this.workspace.isMovable()) {
            // If we center on the block and the workspace isn't movable we could
            // loose blocks at the edges of the workspace.
            return;
        }

        let workspace = this.workspace;
        let block = this;

        // Highlight Definition
        let option = {enabled: true};
        option.text = Blockly.Msg['PROCEDURES_HIGHLIGHT_DEF'];
        let name = this.getProcedureCall();
        option.callback = function () {
            let def = Blockly.Procedures.getDefinition(name, workspace);
            if (def) {
                workspace.centerOnBlock(def.id);
                def.select();
            }
        };
        options.push(option);

        // Show Parameter Names
        options.push({
            enabled: true,
            text: "Show/Hide parameters",
            callback: function () {
                block.showParameterNames_ = !block.showParameterNames_;
                block.updateShape_();
                block.render();
            }
        });

        // Change Return Type
        options.push({
            enabled: true,
            text: this.returns_ ? "Make statement" : "Make expression",
            callback: function () {
                block.returns_ = !block.returns_;
                block.setReturn_(block.returns_, true);
            }
        })
    },
    /**
     * Notification that the procedure's return state has changed.
     * @param {boolean} returnState New return state
     * @param forceRerender Whether to render
     * @this Blockly.Block
     */
    setReturn_: function (returnState, forceRerender) {
        this.unplug(true);
        if (returnState) {
            this.setPreviousStatement(false);
            this.setNextStatement(false);
            this.setOutput(true);
        } else {
            this.setOutput(false);
            this.setPreviousStatement(true);
            this.setNextStatement(true);
        }
        if (forceRerender) {
            if (this.rendered) {
                this.render();
            }
        }
    },
    //defType_: 'procedures_defnoreturn',
    parseArgument_: function (argument) {
        if (argument.startsWith('KWARGS:')) {
            // KWARG
            return "unpack";
        } else if (argument.startsWith('KEYWORD:')) {
            return argument.substring(8) + "=";
        } else {
            if (this.showParameterNames_) {
                if (argument.startsWith("KNOWN_ARG:")) {
                    return argument.substring(10) + "=";
                }
            }
        }
        return "";
    },
    getDrawnArgumentCount_: function () {
        return Math.min(this.argumentCount_, this.arguments_.length);
    }
};

python.pythonGenerator.forBlock['ast_Call'] = function(block, generator) {
    // TODO: Handle import
    if (block.module_) {
        python.pythonGenerator.definitions_["import_"+block.module_] = BlockMirrorTextToBlocks.prototype.MODULE_FUNCTION_IMPORTS[block.module_];
    }
    // python.pythonGenerator.definitions_['import_matplotlib'] = 'import matplotlib.pyplot as plt';
    // Get the caller
    let funcName = "";
    if (block.isMethod_) {
        funcName = python.pythonGenerator.valueToCode(block, 'FUNC', python.pythonGenerator.ORDER_FUNCTION_CALL) ||
            python.pythonGenerator.blank;
    }
    funcName += this.name_;
    // Build the arguments
    var args = [];
    for (var i = 0; i < block.arguments_.length; i++) {
        let value = python.pythonGenerator.valueToCode(block, 'ARG' + i,
            python.pythonGenerator.ORDER_NONE) || python.pythonGenerator.blank;
        let argument = block.arguments_[i];
        if (argument.startsWith('KWARGS:')) {
            args[i] = "**" + value;
        } else if (argument.startsWith('KEYWORD:')) {
            args[i] = argument.substring(8) + "=" + value;
        } else {
            args[i] = value;
        }
    }
    // Return the result
    let code = funcName + '(' + args.join(', ') + ')';
    if (block.returns_) {
        return [code, python.pythonGenerator.ORDER_FUNCTION_CALL];
    } else {
        return code + "\n";
    }
};

BlockMirrorTextToBlocks.prototype.getAsModule = function (node) {
    if (node._astname === 'Name') {
        return Sk.ffi.remapToJs(node.id);
    } else if (node._astname === 'Attribute') {
        let origin = this.getAsModule(node.value);
        if (origin !== null) {
            return origin + '.' + Sk.ffi.remapToJs(node.attr);
        }
    } else {
        return null;
    }
};

//                              messageBefore, message, name
// function call: print() -> "print" ([message]) ; print
// Module function: plt.show() -> "show plot" ([plot]) ; plt.show
// Method call: "test".title() -> "make" [str] "title case" () ; .title ; isMethod = true

BlockMirrorTextToBlocks.prototype['ast_Call'] = function (node, parent) {
    let func = node.func;
    let args = node.args;
    let keywords = node.keywords;

    // Can we make any guesses about this based on its name?
    let signature = null;
    let isMethod = false;
    let module = null;
    let premessage = "";
    let message = "";
    let name = "";
    let caller = null;
    let colour = BlockMirrorTextToBlocks.COLOR.FUNCTIONS;

    if (func._astname === 'Name') {
        message = name = Sk.ffi.remapToJs(func.id);
        if (name in this.FUNCTION_SIGNATURES) {
            signature = this.FUNCTION_SIGNATURES[Sk.ffi.remapToJs(func.id)];
        }
    } else if (func._astname === 'Attribute') {
        isMethod = true;
        caller = func.value;
        let potentialModule = this.getAsModule(caller);
        let attributeName = Sk.ffi.remapToJs(func.attr);
        message = "." + attributeName;
        if (potentialModule in this.MODULE_FUNCTION_SIGNATURES) {
            signature = this.MODULE_FUNCTION_SIGNATURES[potentialModule][attributeName];
            module = potentialModule;
            message = name = potentialModule + message;
            isMethod = false;
        } else if (attributeName in this.METHOD_SIGNATURES) {
            signature = this.METHOD_SIGNATURES[attributeName];
            name = message;
        } else {
            name = message;
        }
    } else {
        isMethod = true;
        message = "";
        name = "";
        caller = func;
        // (lambda x: x)()
    }
    let returns = true;

    if (signature !== null && signature !== undefined) {
        if (signature.custom) {
            try {
                return signature.custom(node, parent, this)
            } catch (e) {
                console.error(e);
                // We tried to be fancy and failed, better fall back to default behavior!
            }
        }
        if ('returns' in signature) {
            returns = signature.returns;
        }
        if ('message' in signature) {
            message = signature.message;
        }
        if ('premessage' in signature) {
            premessage = signature.premessage;
        }
        if ('colour' in signature) {
            colour = signature.colour;
        }
    }

    returns = returns || (parent._astname !== 'Expr');

    let argumentsNormal = {};
    // TODO: do I need to be limiting only the *args* length, not keywords?
    let argumentsMutation = {
        "@arguments": (args !== null ? args.length : 0) +
            (keywords !== null ? keywords.length : 0),
        "@returns": returns,
        "@parameters": true,
        "@method": isMethod,
        "@name": name,
        "@message": message,
        "@premessage": premessage,
        "@colour": colour,
        "@module": module || ""
    };
    // Handle arguments
    let overallI = 0;
    if (args !== null) {
        for (let i = 0; i < args.length; i += 1, overallI += 1) {
            argumentsNormal["ARG" + overallI] = this.convert(args[i], node);
            argumentsMutation["UNKNOWN_ARG:" + overallI] = null;
        }
    }
    if (keywords !== null) {
        for (let i = 0; i < keywords.length; i += 1, overallI += 1) {
            let keyword = keywords[i];
            let arg = keyword.arg;
            let value = keyword.value;
            if (arg === null) {
                argumentsNormal["ARG" + overallI] = this.convert(value, node);
                argumentsMutation["KWARGS:" + overallI] = null;
            } else {
                argumentsNormal["ARG" + overallI] = this.convert(value, node);
                argumentsMutation["KEYWORD:" + Sk.ffi.remapToJs(arg)] = null;
            }
        }
    }
    // Build actual block
    let newBlock;
    if (isMethod) {
        argumentsNormal['FUNC'] = this.convert(caller, node);
        newBlock = BlockMirrorTextToBlocks.create_block("ast_Call", node.lineno,
            {}, argumentsNormal, {inline: true}, argumentsMutation);
    } else {
        newBlock = BlockMirrorTextToBlocks.create_block("ast_Call", node.lineno, {},
            argumentsNormal, {inline: true}, argumentsMutation);
    }
    // Return as either statement or expression
    if (returns) {
        return newBlock;
    } else {
        return [newBlock];
    }
};

Blockly.Blocks['ast_ClassDef'] = {
    init: function () {
        this.decorators_ = 0;
        this.bases_ = 0;
        this.keywords_ = 0;
        this.appendDummyInput('HEADER')
            .appendField("Class")
            .appendField(new Blockly.FieldVariable("item"), "NAME");
        this.appendStatementInput("BODY")
            .setCheck(null);
        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(BlockMirrorTextToBlocks.COLOR.OO);
        this.updateShape_();
    },
    // TODO: Not mutable currently
    updateShape_: function () {
        for (let i = 0; i < this.decorators_; i++) {
            let input = this.appendValueInput("DECORATOR" + i)
                .setCheck(null)
                .setAlign(Blockly.inputs.Align.RIGHT);
            if (i === 0) {
                input.appendField("decorated by");
            }
            this.moveInputBefore('DECORATOR' + i, 'BODY');
        }
        for (let i = 0; i < this.bases_; i++) {
            let input = this.appendValueInput("BASE" + i)
                .setCheck(null)
                .setAlign(Blockly.inputs.Align.RIGHT);
            if (i === 0) {
                input.appendField("inherits from");
            }
            this.moveInputBefore('BASE' + i, 'BODY');
        }

        for (let i = 0; i < this.keywords_; i++) {
            this.appendValueInput("KEYWORDVALUE" + i)
                .setCheck(null)
                .setAlign(Blockly.inputs.Align.RIGHT)
                .appendField(new Blockly.FieldTextInput("metaclass"), "KEYWORDNAME" + i)
                .appendField("=");
            this.moveInputBefore('KEYWORDVALUE' + i, 'BODY');
        }
    },
    /**
     * Create XML to represent the (non-editable) name and arguments.
     * @return {!Element} XML storage element.
     * @this Blockly.Block
     */
    mutationToDom: function () {
        let container = document.createElement('mutation');
        container.setAttribute('decorators', this.decorators_);
        container.setAttribute('bases', this.bases_);
        container.setAttribute('keywords', this.keywords_);
        return container;
    },
    /**
     * Parse XML to restore the (non-editable) name and parameters.
     * @param {!Element} xmlElement XML storage element.
     * @this Blockly.Block
     */
    domToMutation: function (xmlElement) {
        this.decorators_ = parseInt(xmlElement.getAttribute('decorators'), 10);
        this.bases_ = parseInt(xmlElement.getAttribute('bases'), 10);
        this.keywords_ = parseInt(xmlElement.getAttribute('keywords'), 10);
        this.updateShape_();
    },
};

python.pythonGenerator.forBlock['ast_ClassDef'] = function(block, generator) {
    // Name
    let name = python.pythonGenerator.getVariableName(block.getFieldValue('NAME'), Blockly.Variables.NAME_TYPE);
    // Decorators
    let decorators = new Array(block.decorators_);
    for (let i = 0; i < block.decorators_; i++) {
        let decorator = (python.pythonGenerator.valueToCode(block, 'DECORATOR' + i, python.pythonGenerator.ORDER_NONE) ||
            python.pythonGenerator.blank);
        decorators[i] = "@" + decorator + "\n";
    }
    // Bases
    let bases = new Array(block.bases_);
    for (let i = 0; i < block.bases_; i++) {
        bases[i] = (python.pythonGenerator.valueToCode(block, 'BASE' + i, python.pythonGenerator.ORDER_NONE) ||
            python.pythonGenerator.blank);
    }
    // Keywords
    let keywords = new Array(block.keywords_);
    for (let i = 0; i < block.keywords_; i++) {
        let name = block.getFieldValue('KEYWORDNAME' + i);
        let value = (python.pythonGenerator.valueToCode(block, 'KEYWORDVALUE' + i, python.pythonGenerator.ORDER_NONE) ||
            python.pythonGenerator.blank);
        if (name == '**') {
            keywords[i] = '**' + value;
        } else {
            keywords[i] = name + '=' + value;
        }
    }
    // Body:
    let body = python.pythonGenerator.statementToCode(block, 'BODY') || python.pythonGenerator.PASS;
    // Put it together
    let args = (bases.concat(keywords));
    args = (args.length === 0) ? "" : "(" + args.join(', ') + ")";
    return decorators.join('') + "class " + name + args + ":\n" + body;
}
;

BlockMirrorTextToBlocks.prototype['ast_ClassDef'] = function (node, parent) {
    let name = node.name;
    let bases = node.bases;
    let keywords = node.keywords;
    let body = node.body;
    let decorator_list = node.decorator_list;

    let values = {};
    let fields = {'NAME': Sk.ffi.remapToJs(name)};

    if (decorator_list !== null) {
        for (let i = 0; i < decorator_list.length; i++) {
            values['DECORATOR' + i] = this.convert(decorator_list[i], node);
        }
    }

    if (bases !== null) {
        for (let i = 0; i < bases.length; i++) {
            values['BASE' + i] = this.convert(bases[i], node);
        }
    }

    if (keywords !== null) {
        for (let i = 0; i < keywords.length; i++) {
            values['KEYWORDVALUE' + i] = this.convert(keywords[i].value, node);
            let arg = keywords[i].arg;
            if (arg === null) {
                fields['KEYWORDNAME' + i] = "**";
            } else {
                fields['KEYWORDNAME' + i] = Sk.ffi.remapToJs(arg);
            }
        }
    }

    return BlockMirrorTextToBlocks.create_block("ast_ClassDef", node.lineno, fields,
        values,
        {
            "inline": "false"
        }, {
            "@decorators": (decorator_list === null ? 0 : decorator_list.length),
            "@bases": (bases === null ? 0 : bases.length),
            "@keywords": (keywords === null ? 0 : keywords.length),
        }, {
            'BODY': this.convertBody(body, node)
        });
};
BlockMirrorTextToBlocks.BLOCKS.push({
    "type": "ast_Comment",
    "message0": "# Comment: %1",
    "args0": [{"type": "field_input", "name": "BODY", "text": "will be ignored"}],
    "inputsInline": true,
    "previousStatement": null,
    "nextStatement": null,
    "colour": BlockMirrorTextToBlocks.COLOR.PYTHON,
});

python.pythonGenerator.forBlock['ast_Comment'] = function(block) {
    var text_body = block.getFieldValue('BODY');
    return '#'+text_body+'\n';
};

BlockMirrorTextToBlocks.prototype['ast_Comment'] = function (txt, lineno) {
    var commentText = txt.slice(1);
    /*if (commentText.length && commentText[0] === " ") {
        commentText = commentText.substring(1);
    }*/
    return BlockMirrorTextToBlocks.create_block("ast_Comment", lineno, {
        "BODY": commentText
    })
};BlockMirrorTextToBlocks.BLOCKS.push({
  type: "ast_comprehensionFor",
  message0: "for %1 in %2",
  args0: [
    { type: "input_value", name: "TARGET" },
    { type: "input_value", name: "ITER" },
  ],
  inputsInline: true,
  output: "ComprehensionFor",
  colour: BlockMirrorTextToBlocks.COLOR.SEQUENCES,
});

BlockMirrorTextToBlocks.BLOCKS.push({
  type: "ast_comprehensionIf",
  message0: "if %1",
  args0: [{ type: "input_value", name: "TEST" }],
  inputsInline: true,
  output: "ComprehensionIf",
  colour: BlockMirrorTextToBlocks.COLOR.SEQUENCES,
});

Blockly.Blocks["ast_Comp_create_with_container"] = {
  /**
   * Mutator block for dict container.
   * @this Blockly.Block
   */
  init: function () {
    this.setColour(BlockMirrorTextToBlocks.COLOR.SEQUENCES);
    this.appendDummyInput().appendField("Add new comprehensions below");
    this.appendDummyInput().appendField("   For clause");
    this.appendStatementInput("STACK");
    this.contextMenu = false;
  },
};

Blockly.Blocks["ast_Comp_create_with_for"] = {
  /**
   * Mutator block for adding items.
   * @this Blockly.Block
   */
  init: function () {
    this.setColour(BlockMirrorTextToBlocks.COLOR.SEQUENCES);
    this.appendDummyInput().appendField("For clause");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.contextMenu = false;
  },
};

Blockly.Blocks["ast_Comp_create_with_if"] = {
  /**
   * Mutator block for adding items.
   * @this Blockly.Block
   */
  init: function () {
    this.setColour(BlockMirrorTextToBlocks.COLOR.SEQUENCES);
    this.appendDummyInput().appendField("If clause");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.contextMenu = false;
  },
};

BlockMirrorTextToBlocks.COMP_SETTINGS = {
  ListComp: { start: "[", end: "]", color: BlockMirrorTextToBlocks.COLOR.LIST },
  SetComp: { start: "{", end: "}", color: BlockMirrorTextToBlocks.COLOR.SET },
  GeneratorExp: {
    start: "(",
    end: ")",
    color: BlockMirrorTextToBlocks.COLOR.SEQUENCES,
  },
  DictComp: {
    start: "{",
    end: "}",
    color: BlockMirrorTextToBlocks.COLOR.DICTIONARY,
  },
};

["ListComp", "SetComp", "GeneratorExp", "DictComp"].forEach(function (kind) {
  Blockly.Blocks["ast_" + kind] = {
    /**
     * Block for creating a dict with any number of elements of any type.
     * @this Blockly.Block
     */
    init: function () {
      this.setStyle("loop_blocks");
      this.setColour(BlockMirrorTextToBlocks.COMP_SETTINGS[kind].color);
      this.itemCount_ = 3;
      let input = this.appendValueInput("ELT").appendField(
        BlockMirrorTextToBlocks.COMP_SETTINGS[kind].start,
      );
      if (kind === "DictComp") {
        input.setCheck("DictPair");
      }
      this.appendDummyInput("END_BRACKET").appendField(
        BlockMirrorTextToBlocks.COMP_SETTINGS[kind].end,
      );
      this.updateShape_();
      this.setOutput(true);
      this.setMutator(
        new Blockly.icons.MutatorIcon(
          ["ast_Comp_create_with_for", "ast_Comp_create_with_if"],
          this,
        ),
      );
    },
    /**
     * Create XML to represent dict inputs.
     * @return {!Element} XML storage element.
     * @this Blockly.Block
     */
    mutationToDom: function () {
      var container = document.createElement("mutation");
      container.setAttribute("items", this.itemCount_);
      return container;
    },
    /**
     * Parse XML to restore the dict inputs.
     * @param {!Element} xmlElement XML storage element.
     * @this Blockly.Block
     */
    domToMutation: function (xmlElement) {
      this.itemCount_ = parseInt(xmlElement.getAttribute("items"), 10);
      this.updateShape_();
    },
    /**
     * Populate the mutator's dialog with this block's components.
     * @param {!Blockly.Workspace} workspace Mutator's workspace.
     * @return {!Blockly.Block} Root block in mutator.
     * @this Blockly.Block
     */
    decompose: function (workspace) {
      var containerBlock = workspace.newBlock("ast_Comp_create_with_container");
      containerBlock.initSvg();
      var connection = containerBlock.getInput("STACK").connection;
      let generators = [];
      for (var i = 1; i < this.itemCount_; i++) {
        let generator = this.getInput("GENERATOR" + i).connection;
        let createName;
        if (
          generator.targetConnection.getSourceBlock().type ===
          "ast_comprehensionIf"
        ) {
          createName = "ast_Comp_create_with_if";
        } else if (
          generator.targetConnection.getSourceBlock().type ===
          "ast_comprehensionFor"
        ) {
          createName = "ast_Comp_create_with_for";
        } else {
          throw Error(
            "Unknown block type: " +
              generator.targetConnection.getSourceBlock().type,
          );
        }
        var itemBlock = workspace.newBlock(createName);
        itemBlock.initSvg();
        connection.connect(itemBlock.previousConnection);
        connection = itemBlock.nextConnection;
        generators.push(itemBlock);
      }
      return containerBlock;
    },
    /**
     * Reconfigure this block based on the mutator dialog's components.
     * @param {!Blockly.Block} containerBlock Root block in mutator.
     * @this Blockly.Block
     */
    compose: function (containerBlock) {
      var itemBlock = containerBlock.getInputTargetBlock("STACK");
      // Count number of inputs.
      var connections = [containerBlock.valueConnection_];
      let blockTypes = ["ast_Comp_create_with_for"];
      while (itemBlock) {
        connections.push(itemBlock.valueConnection_);
        blockTypes.push(itemBlock.type);
        itemBlock =
          itemBlock.nextConnection && itemBlock.nextConnection.targetBlock();
      }
      // Disconnect any children that don't belong.
      for (var i = 1; i < this.itemCount_; i++) {
        var connection = this.getInput("GENERATOR" + i).connection
          .targetConnection;
        if (connection && connections.indexOf(connection) === -1) {
          let connectedBlock = connection.getSourceBlock();
          if (connectedBlock.type === "ast_comprehensionIf") {
            let testField = connectedBlock.getInput("TEST");
            if (testField.connection.targetConnection) {
              testField.connection.targetConnection
                .getSourceBlock()
                .unplug(true);
            }
          } else if (connectedBlock.type === "ast_comprehensionFor") {
            let iterField = connectedBlock.getInput("ITER");
            if (iterField.connection.targetConnection) {
              iterField.connection.targetConnection
                .getSourceBlock()
                .unplug(true);
            }
            let targetField = connectedBlock.getInput("TARGET");
            if (targetField.connection.targetConnection) {
              targetField.connection.targetConnection
                .getSourceBlock()
                .unplug(true);
            }
          } else {
            throw Error("Unknown block type: " + connectedBlock.type);
          }
          connection.disconnect();
          connection.getSourceBlock().dispose();
        }
      }
      this.itemCount_ = connections.length;
      this.updateShape_();
      // Reconnect any child blocks.
      for (var i = 1; i < this.itemCount_; i++) {
        connections[i]?.reconnect(this, "GENERATOR" + i);
        // TODO: glitch when inserting into middle, deletes children values
        if (!connections[i]) {
          let createName;
          if (blockTypes[i] === "ast_Comp_create_with_if") {
            createName = "ast_comprehensionIf";
          } else if (blockTypes[i] === "ast_Comp_create_with_for") {
            createName = "ast_comprehensionFor";
          } else {
            throw Error("Unknown block type: " + blockTypes[i]);
          }
          let itemBlock = this.workspace.newBlock(createName);
          itemBlock.setDeletable(false);
          itemBlock.setMovable(false);
          itemBlock.initSvg();
          this.getInput("GENERATOR" + i).connection.connect(
            itemBlock.outputConnection,
          );
          itemBlock.render();
          //this.get(itemBlock, 'ADD'+i)
        }
      }
    },
    /**
     * Store pointers to any connected child blocks.
     * @param {!Blockly.Block} containerBlock Root block in mutator.
     * @this Blockly.Block
     */
    saveConnections: function (containerBlock) {
      containerBlock.valueConnection_ =
        this.getInput("GENERATOR0").connection.targetConnection;
      var itemBlock = containerBlock.getInputTargetBlock("STACK");
      var i = 1;
      while (itemBlock) {
        var input = this.getInput("GENERATOR" + i);
        itemBlock.valueConnection_ = input && input.connection.targetConnection;
        i++;
        itemBlock =
          itemBlock.nextConnection && itemBlock.nextConnection.targetBlock();
      }
    },
    /**
     * Modify this block to have the correct number of inputs.
     * @private
     * @this Blockly.Block
     */
    updateShape_: function () {
      // Add new inputs.
      for (var i = 0; i < this.itemCount_; i++) {
        if (!this.getInput("GENERATOR" + i)) {
          let input = this.appendValueInput("GENERATOR" + i);
          if (i === 0) {
            input.setCheck("ComprehensionFor");
          } else {
            input.setCheck(["ComprehensionFor", "ComprehensionIf"]);
          }
          this.moveInputBefore("GENERATOR" + i, "END_BRACKET");
        }
      }
      // Remove deleted inputs.
      while (this.getInput("GENERATOR" + i)) {
        this.removeInput("GENERATOR" + i);
        i++;
      }
    },
  };

  python.pythonGenerator.forBlock["ast_" + kind] = function (block) {
    // elt
    let elt;
    if (kind === "DictComp") {
      let child = block.getInputTargetBlock("ELT");
      if (child === null || child.type !== "ast_DictItem") {
        elt =
          python.pythonGenerator.blank + ": " + python.pythonGenerator.blank;
      } else {
        let key =
          python.pythonGenerator.valueToCode(
            child,
            "KEY",
            python.pythonGenerator.ORDER_NONE,
          ) || python.pythonGenerator.blank;
        let value =
          python.pythonGenerator.valueToCode(
            child,
            "VALUE",
            python.pythonGenerator.ORDER_NONE,
          ) || python.pythonGenerator.blank;
        elt = key + ": " + value;
      }
    } else {
      elt =
        python.pythonGenerator.valueToCode(
          block,
          "ELT",
          python.pythonGenerator.ORDER_NONE,
        ) || python.pythonGenerator.blank;
    }
    // generators
    let elements = new Array(block.itemCount_);
    const BAD_DEFAULT =
      elt +
      " for " +
      python.pythonGenerator.blank +
      " in" +
      python.pythonGenerator.blank;
    for (var i = 0; i < block.itemCount_; i++) {
      let child = block.getInputTargetBlock("GENERATOR" + i);
      if (child === null) {
        elements[i] = BAD_DEFAULT;
      } else if (child.type === "ast_comprehensionIf") {
        let test =
          python.pythonGenerator.valueToCode(
            child,
            "TEST",
            python.pythonGenerator.ORDER_NONE,
          ) || python.pythonGenerator.blank;
        elements[i] = "if " + test;
      } else if (child.type === "ast_comprehensionFor") {
        let target =
          python.pythonGenerator.valueToCode(
            child,
            "TARGET",
            python.pythonGenerator.ORDER_NONE,
          ) || python.pythonGenerator.blank;
        let iter =
          python.pythonGenerator.valueToCode(
            child,
            "ITER",
            python.pythonGenerator.ORDER_NONE,
          ) || python.pythonGenerator.blank;
        elements[i] = "for " + target + " in " + iter;
      } else {
        elements[i] = BAD_DEFAULT;
      }
    }
    // Put it all together
    let code =
      BlockMirrorTextToBlocks.COMP_SETTINGS[kind].start +
      elt +
      " " +
      elements.join(" ") +
      BlockMirrorTextToBlocks.COMP_SETTINGS[kind].end;
    return [code, python.pythonGenerator.ORDER_ATOMIC];
  };

  BlockMirrorTextToBlocks.prototype["ast_" + kind] = function (node, parent) {
    let generators = node.generators;

    let elements = {};
    if (kind === "DictComp") {
      let key = node.key;
      let value = node.value;
      elements["ELT"] = BlockMirrorTextToBlocks.create_block(
        "ast_DictItem",
        node.lineno,
        {},
        {
          KEY: this.convert(key, node),
          VALUE: this.convert(value, node),
        },
        {
          inline: "true",
          deletable: "false",
          movable: "false",
        },
      );
    } else {
      let elt = node.elt;
      elements["ELT"] = this.convert(elt, node);
    }
    let DEFAULT_SETTINGS = {
      inline: "true",
      deletable: "false",
      movable: "false",
    };
    let g = 0;
    for (let i = 0; i < generators.length; i++) {
      let target = generators[i].target;
      let iter = generators[i].iter;
      let ifs = generators[i].ifs;
      let is_async = generators[i].is_async;
      elements["GENERATOR" + g] = BlockMirrorTextToBlocks.create_block(
        "ast_comprehensionFor",
        node.lineno,
        {},
        {
          ITER: this.convert(iter, node),
          TARGET: this.convert(target, node),
        },
        DEFAULT_SETTINGS,
      );
      g += 1;
      if (ifs) {
        for (let j = 0; j < ifs.length; j++) {
          elements["GENERATOR" + g] = BlockMirrorTextToBlocks.create_block(
            "ast_comprehensionIf",
            node.lineno,
            {},
            {
              TEST: this.convert(ifs[j], node),
            },
            DEFAULT_SETTINGS,
          );
          g += 1;
        }
      }
    }

    return BlockMirrorTextToBlocks.create_block(
      "ast_" + kind,
      node.lineno,
      {},
      elements,
      {
        inline: "false",
      },
      {
        "@items": g,
      },
    );
  };
});
BlockMirrorTextToBlocks.COMPARES = [
    ["==", "Eq", 'Return whether the two values are equal.'],
    ["!=", "NotEq", 'Return whether the two values are not equal.'],
    ["<", "Lt", 'Return whether the left value is less than the right value.'],
    ["<=", "LtE", 'Return whether the left value is less than or equal to the right value.'],
    [">", "Gt", 'Return whether the left value is greater than the right value.'],
    [">=", "GtE", 'Return whether the left value is greater than or equal to the right value.'],
    ["is", "Is", 'Return whether the left value is identical to the right value.'],
    ["is not", "IsNot", 'Return whether the left value is not identical to the right value.'],
    ["in", "In", 'Return whether the left value is in the right value.'],
    ["not in", "NotIn", 'Return whether the left value is not in the right value.'],
];

var COMPARES_BLOCKLY_DISPLAY = BlockMirrorTextToBlocks.COMPARES.map(
    boolop => [boolop[0], boolop[1]]
);
var COMPARES_BLOCKLY_GENERATE = {};
BlockMirrorTextToBlocks.COMPARES.forEach(function (boolop) {
    COMPARES_BLOCKLY_GENERATE[boolop[1]] = boolop[0];
});

BlockMirrorTextToBlocks.BLOCKS.push({
    "type": "ast_Compare",
    "message0": "%1 %2 %3",
    "args0": [
        {"type": "input_value", "name": "A"},
        {"type": "field_dropdown", "name": "OP", "options": COMPARES_BLOCKLY_DISPLAY},
        {"type": "input_value", "name": "B"}
    ],
    "inputsInline": true,
    "output": null,
    "colour": BlockMirrorTextToBlocks.COLOR.LOGIC
});

python.pythonGenerator.forBlock['ast_Compare'] = function(block, generator) {
    // Basic arithmetic operators, and power.
    var tuple = COMPARES_BLOCKLY_GENERATE[block.getFieldValue('OP')];
    var operator = ' ' + tuple + ' ';
    var order = python.pythonGenerator.ORDER_RELATIONAL;
    var argument0 = python.pythonGenerator.valueToCode(block, 'A', order) || python.pythonGenerator.blank;
    var argument1 = python.pythonGenerator.valueToCode(block, 'B', order) || python.pythonGenerator.blank;
    var code = argument0 + operator + argument1;
    return [code, order];
};

BlockMirrorTextToBlocks.prototype['ast_Compare'] = function (node, parent) {
    var ops = node.ops;
    var left = node.left;
    var values = node.comparators;
    var result_block = this.convert(left, node);
    for (var i = 0; i < values.length; i += 1) {
        result_block = BlockMirrorTextToBlocks.create_block("ast_Compare", node.lineno, {
            "OP": ops[i].name
        }, {
            "A": result_block,
            "B": this.convert(values[i], node)
        }, {
            "inline": "true"
        });
    }
    return result_block;
};BlockMirrorTextToBlocks.BLOCKS.push({
    "type": "ast_Continue",
    "message0": "continue",
    "inputsInline": false,
    "previousStatement": null,
    "nextStatement": null,
    "colour": BlockMirrorTextToBlocks.COLOR.CONTROL,
});

python.pythonGenerator.forBlock['ast_Continue'] = function(block, generator) {
    return "continue\n";
};

BlockMirrorTextToBlocks.prototype['ast_Continue'] = function (node, parent) {
    return BlockMirrorTextToBlocks.create_block("ast_Continue", node.lineno);
};Blockly.Blocks['ast_Delete'] = {
    init: function () {
        this.setInputsInline(true);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(BlockMirrorTextToBlocks.COLOR.VARIABLES);
        this.targetCount_ = 1;

        this.appendDummyInput()
            .appendField("delete");
        this.updateShape_();
    },
    updateShape_: function () {
        // Add new inputs.
        for (var i = 0; i < this.targetCount_; i++) {
            if (!this.getInput('TARGET' + i)) {
                var input = this.appendValueInput('TARGET' + i);
                if (i !== 0) {
                    input.appendField(',').setAlign(Blockly.inputs.Align.RIGHT);
                }
            }
        }
        // Remove deleted inputs.
        while (this.getInput('TARGET' + i)) {
            this.removeInput('TARGET' + i);
            i++;
        }
    },
    /**
     * Create XML to represent list inputs.
     * @return {!Element} XML storage element.
     * @this Blockly.Block
     */
    mutationToDom: function () {
        var container = document.createElement('mutation');
        container.setAttribute('targets', this.targetCount_);
        return container;
    },
    /**
     * Parse XML to restore the list inputs.
     * @param {!Element} xmlElement XML storage element.
     * @this Blockly.Block
     */
    domToMutation: function (xmlElement) {
        this.targetCount_ = parseInt(xmlElement.getAttribute('targets'), 10);
        this.updateShape_();
    },
};

python.pythonGenerator.forBlock['ast_Delete'] = function(block, generator) {
    // Create a list with any number of elements of any type.
    var elements = new Array(block.targetCount_);
    for (var i = 0; i < block.targetCount_; i++) {
        elements[i] = python.pythonGenerator.valueToCode(block, 'TARGET' + i,
            python.pythonGenerator.ORDER_NONE) || python.pythonGenerator.blank;
    }
    var code = 'del ' + elements.join(', ') + "\n";
    return code;
};

BlockMirrorTextToBlocks.prototype['ast_Delete'] = function (node, parent) {
    let targets = node.targets;

    return BlockMirrorTextToBlocks.create_block("ast_Delete", node.lineno, {},
        this.convertElements("TARGET", targets, node),
        {
            "inline": "true",
        }, {
            "@targets": targets.length
        });
};Blockly.Blocks["ast_DictItem"] = {
  init: function () {
    this.appendValueInput("KEY").setCheck(null);
    this.appendValueInput("VALUE").setCheck(null).appendField(":");
    this.setInputsInline(true);
    this.setOutput(true, "DictPair");
    this.setColour(BlockMirrorTextToBlocks.COLOR.DICTIONARY);
  },
};

Blockly.Blocks["ast_Dict"] = {
  /**
   * Block for creating a dict with any number of elements of any type.
   * @this Blockly.Block
   */
  init: function () {
    this.setColour(BlockMirrorTextToBlocks.COLOR.DICTIONARY);
    this.itemCount_ = 3;
    this.updateShape_();
    this.setOutput(true, "Dict");
    this.setMutator(
      new Blockly.icons.MutatorIcon(["ast_Dict_create_with_item"], this),
    );
  },
  /**
   * Create XML to represent dict inputs.
   * @return {!Element} XML storage element.
   * @this Blockly.Block
   */
  mutationToDom: function () {
    var container = document.createElement("mutation");
    container.setAttribute("items", this.itemCount_);
    return container;
  },
  /**
   * Parse XML to restore the dict inputs.
   * @param {!Element} xmlElement XML storage element.
   * @this Blockly.Block
   */
  domToMutation: function (xmlElement) {
    this.itemCount_ = parseInt(xmlElement.getAttribute("items"), 10);
    this.updateShape_();
  },
  /**
   * Populate the mutator's dialog with this block's components.
   * @param {!Blockly.Workspace} workspace Mutator's workspace.
   * @return {!Blockly.Block} Root block in mutator.
   * @this Blockly.Block
   */
  decompose: function (workspace) {
    var containerBlock = workspace.newBlock("ast_Dict_create_with_container");
    containerBlock.initSvg();
    var connection = containerBlock.getInput("STACK").connection;
    for (var i = 0; i < this.itemCount_; i++) {
      var itemBlock = workspace.newBlock("ast_Dict_create_with_item");
      itemBlock.initSvg();
      connection.connect(itemBlock.previousConnection);
      connection = itemBlock.nextConnection;
    }
    return containerBlock;
  },
  /**
   * Reconfigure this block based on the mutator dialog's components.
   * @param {!Blockly.Block} containerBlock Root block in mutator.
   * @this Blockly.Block
   */
  compose: function (containerBlock) {
    var itemBlock = containerBlock.getInputTargetBlock("STACK");
    // Count number of inputs.
    var connections = [];
    while (itemBlock) {
      connections.push(itemBlock.valueConnection_);
      itemBlock =
        itemBlock.nextConnection && itemBlock.nextConnection.targetBlock();
    }
    // Disconnect any children that don't belong.
    for (var i = 0; i < this.itemCount_; i++) {
      var connection = this.getInput("ADD" + i).connection.targetConnection;
      if (connection && connections.indexOf(connection) == -1) {
        let key = connection.getSourceBlock().getInput("KEY");
        if (key.connection.targetConnection) {
          key.connection.targetConnection.getSourceBlock().unplug(true);
        }
        let value = connection.getSourceBlock().getInput("VALUE");
        if (value.connection.targetConnection) {
          value.connection.targetConnection.getSourceBlock().unplug(true);
        }
        connection.disconnect();
        connection.getSourceBlock().dispose();
      }
    }
    this.itemCount_ = connections.length;
    this.updateShape_();
    // Reconnect any child blocks.
    for (var i = 0; i < this.itemCount_; i++) {
      connections[i]?.reconnect(this, "ADD" + i);
      if (!connections[i]) {
        let itemBlock = this.workspace.newBlock("ast_DictItem");
        itemBlock.setDeletable(false);
        itemBlock.setMovable(false);
        itemBlock.initSvg();
        this.getInput("ADD" + i).connection.connect(itemBlock.outputConnection);
        itemBlock.render();
        //this.get(itemBlock, 'ADD'+i)
      }
    }
  },
  /**
   * Store pointers to any connected child blocks.
   * @param {!Blockly.Block} containerBlock Root block in mutator.
   * @this Blockly.Block
   */
  saveConnections: function (containerBlock) {
    var itemBlock = containerBlock.getInputTargetBlock("STACK");
    var i = 0;
    while (itemBlock) {
      var input = this.getInput("ADD" + i);
      itemBlock.valueConnection_ = input && input.connection.targetConnection;
      i++;
      itemBlock =
        itemBlock.nextConnection && itemBlock.nextConnection.targetBlock();
    }
  },
  /**
   * Modify this block to have the correct number of inputs.
   * @private
   * @this Blockly.Block
   */
  updateShape_: function () {
    if (this.itemCount_ && this.getInput("EMPTY")) {
      this.removeInput("EMPTY");
    } else if (!this.itemCount_ && !this.getInput("EMPTY")) {
      this.appendDummyInput("EMPTY").appendField("empty dictionary");
    }
    // Add new inputs.
    for (var i = 0; i < this.itemCount_; i++) {
      if (!this.getInput("ADD" + i)) {
        var input = this.appendValueInput("ADD" + i).setCheck("DictPair");
        if (i === 0) {
          input
            .appendField("create dict with")
            .setAlign(Blockly.inputs.Align.RIGHT);
        }
      }
    }
    // Remove deleted inputs.
    while (this.getInput("ADD" + i)) {
      this.removeInput("ADD" + i);
      i++;
    }
    // Add the trailing "}"
    /*
        if (this.getInput('TAIL')) {
            this.removeInput('TAIL');
        }
        if (this.itemCount_) {
            let tail = this.appendDummyInput('TAIL')
                .appendField('}');
            tail.setAlign(Blockly.inputs.Align.RIGHT);
        }*/
  },
};

Blockly.Blocks["ast_Dict_create_with_container"] = {
  /**
   * Mutator block for dict container.
   * @this Blockly.Block
   */
  init: function () {
    this.setColour(BlockMirrorTextToBlocks.COLOR.DICTIONARY);
    this.appendDummyInput().appendField("Add new dict elements below");
    this.appendStatementInput("STACK");
    this.contextMenu = false;
  },
};

Blockly.Blocks["ast_Dict_create_with_item"] = {
  /**
   * Mutator block for adding items.
   * @this Blockly.Block
   */
  init: function () {
    this.setColour(BlockMirrorTextToBlocks.COLOR.DICTIONARY);
    this.appendDummyInput().appendField("Element");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.contextMenu = false;
  },
};

python.pythonGenerator.forBlock["ast_Dict"] = function (block, generator) {
  // Create a dict with any number of elements of any type.
  var elements = new Array(block.itemCount_);
  for (var i = 0; i < block.itemCount_; i++) {
    let child = block.getInputTargetBlock("ADD" + i);
    if (child === null || child.type != "ast_DictItem") {
      elements[i] =
        python.pythonGenerator.blank + ": " + python.pythonGenerator.blank;
      continue;
    }
    let key =
      python.pythonGenerator.valueToCode(
        child,
        "KEY",
        python.pythonGenerator.ORDER_NONE,
      ) || python.pythonGenerator.blank;
    let value =
      python.pythonGenerator.valueToCode(
        child,
        "VALUE",
        python.pythonGenerator.ORDER_NONE,
      ) || python.pythonGenerator.blank;
    elements[i] = key + ": " + value;
  }
  var code = "{" + elements.join(", ") + "}";
  return [code, python.pythonGenerator.ORDER_ATOMIC];
};

BlockMirrorTextToBlocks.prototype["ast_Dict"] = function (node, parent) {
  let keys = node.keys;
  let values = node.values;

  if (keys === null) {
    return BlockMirrorTextToBlocks.create_block(
      "ast_Dict",
      node.lineno,
      {},
      {},
      { inline: "false" },
      { "@items": 0 },
    );
  }

  let elements = {};
  for (let i = 0; i < keys.length; i++) {
    let key = keys[i];
    let value = values[i];
    elements["ADD" + i] = BlockMirrorTextToBlocks.create_block(
      "ast_DictItem",
      node.lineno,
      {},
      {
        KEY: this.convert(key, node),
        VALUE: this.convert(value, node),
      },
      this.LOCKED_BLOCK,
    );
  }

  return BlockMirrorTextToBlocks.create_block(
    "ast_Dict",
    node.lineno,
    {},
    elements,
    {
      inline: "false",
    },
    {
      "@items": keys.length,
    },
  );
};
BlockMirrorTextToBlocks.BLOCKS.push({
    "type": "ast_Expr",
    "message0": "do nothing with %1",
    "args0": [
        {"type": "input_value", "name": "VALUE"}
    ],
    "inputsInline": false,
    "previousStatement": null,
    "nextStatement": null,
    "colour": BlockMirrorTextToBlocks.COLOR.PYTHON,
});

python.pythonGenerator.forBlock['ast_Expr'] = function(block, generator) {
    // Numeric value.
    var value = python.pythonGenerator.valueToCode(block, 'VALUE', python.pythonGenerator.ORDER_ATOMIC) || python.pythonGenerator.blank;
    // TODO: Assemble JavaScript into code variable.
    return value+"\n";
};

BlockMirrorTextToBlocks.prototype['ast_Expr'] = function (node, parent) {
    var value = node.value;

    var converted = this.convert(value, node);

    if (converted.constructor === Array) {
        return converted[0];
    } else if (this.isTopLevel(parent)) {
        return [this.convert(value, node)];
    } else {
        return BlockMirrorTextToBlocks.create_block("ast_Expr", node.lineno, {}, {
            "VALUE": this.convert(value, node)
        });
    }
};
BlockMirrorTextToBlocks.BLOCKS.push({
  "type": "ast_For",
  "message0": "for each item %1 in list %2 : %3 %4",
  "args0": [
    { "type": "input_value", "name": "TARGET" },
    { "type": "input_value", "name": "ITER" },
    { "type": "input_dummy" },
    { "type": "input_statement", "name": "BODY" }
  ],
  "inputsInline": true,
  "previousStatement": null,
  "nextStatement": null,
  "colour": BlockMirrorTextToBlocks.COLOR.CONTROL,
})

BlockMirrorTextToBlocks.BLOCKS.push({
  "type": "ast_ForElse",
  "message0": "for each item %1 in list %2 : %3 %4 else: %5 %6",
  "args0": [
    { "type": "input_value", "name": "TARGET" },
    { "type": "input_value", "name": "ITER" },
    { "type": "input_dummy" },
    { "type": "input_statement", "name": "BODY" },
    { "type": "input_dummy" },
    { "type": "input_statement", "name": "ELSE" }
  ],
  "inputsInline": true,
  "previousStatement": null,
  "nextStatement": null,
  "colour": BlockMirrorTextToBlocks.COLOR.CONTROL,
})

python.pythonGenerator.forBlock['ast_For'] = function(block, generator) {
  // For each loop.
  var argument0 = python.pythonGenerator.valueToCode(block, 'TARGET',
      python.pythonGenerator.ORDER_RELATIONAL) || python.pythonGenerator.blank;
  var argument1 = python.pythonGenerator.valueToCode(block, 'ITER',
      python.pythonGenerator.ORDER_RELATIONAL) || python.pythonGenerator.blank;
  var branchBody = python.pythonGenerator.statementToCode(block, 'BODY') || python.pythonGenerator.PASS;
  var code = 'for ' + argument0 + ' in ' + argument1 + ':\n' + branchBody;

  if (block.getInputTargetBlock('ELSE')) {
      var branchElse = python.pythonGenerator.statementToCode(block, 'ELSE');

      if (branchElse) {
        code += 'else:\n' + branchElse;
      }
  }
  return code;
};

BlockMirrorTextToBlocks.prototype['ast_For'] = function (node, parent) {
    var target = node.target;
    var iter = node.iter;
    var body = node.body;
    var orelse = node.orelse;
    
    var blockName = 'ast_For';
    var bodies = {'BODY': this.convertBody(body, node)};
    
    if (orelse.length > 0) {
        blockName = "ast_ForElse";
        bodies['ELSE'] = this.convertBody(orelse, node);
    }

    return BlockMirrorTextToBlocks.create_block(blockName, node.lineno, {
    }, {
        "ITER": this.convert(iter, node),
        "TARGET": this.convert(target, node)
    }, {}, {}, bodies);
}

python.pythonGenerator.forBlock['ast_ForElse'] = python.pythonGenerator.forBlock['ast_For']
BlockMirrorTextToBlocks.prototype['ast_ForElse'] = BlockMirrorTextToBlocks.prototype['ast_For'];
// TODO: what if a user deletes a parameter through the context menu?

// The mutator container
BlockMirrorTextToBlocks.BLOCKS.push({
    "type": "ast_FunctionHeaderMutator",
    "message0": "Setup parameters below: %1 %2 returns %3",
    "args0": [
        {"type": "input_dummy"},
        {"type": "input_statement", "name": "STACK", "align": "RIGHT"},
        {"type": "field_checkbox", "name": "RETURNS", "checked": true, "align": "RIGHT"}
    ],
    "colour": BlockMirrorTextToBlocks.COLOR.FUNCTIONS,
    "enableContextMenu": false
});

// The elements you can put into the mutator
[
    ['Parameter', 'Parameter', '', false, false],
    ['ParameterType', 'Parameter with type', '', true, false],
    ['ParameterDefault', 'Parameter with default value', '', false, true],
    ['ParameterDefaultType', 'Parameter with type and default value', '', true, true],
    ['ParameterVararg', 'Variable length parameter', '*', false, false],
    ['ParameterVarargType', 'Variable length parameter with type', '*', true, false],
    ['ParameterKwarg', 'Keyworded Variable length parameter', '**', false],
    ['ParameterKwargType', 'Keyworded Variable length parameter with type', '**', true, false],
].forEach(function (parameterTypeTuple) {
    let parameterType = parameterTypeTuple[0],
        parameterDescription = parameterTypeTuple[1],
        parameterPrefix = parameterTypeTuple[2],
        parameterTyped = parameterTypeTuple[3],
        parameterDefault = parameterTypeTuple[4];
    BlockMirrorTextToBlocks.BLOCKS.push({
        "type": "ast_FunctionMutant" + parameterType,
        "message0": parameterDescription,
        "previousStatement": null,
        "nextStatement": null,
        "colour": BlockMirrorTextToBlocks.COLOR.FUNCTIONS,
        "enableContextMenu": false
    });
    let realParameterBlock = {
        "type": "ast_Function" + parameterType,
        "output": "Parameter",
        "message0": parameterPrefix + (parameterPrefix ? ' ' : '') + "%1",
        "args0": [{"type": "field_variable", "name": "NAME", "variable": "param"}],
        "colour": BlockMirrorTextToBlocks.COLOR.FUNCTIONS,
        "enableContextMenu": false,
        "inputsInline": (parameterTyped && parameterDefault),
    };
    if (parameterTyped) {
        realParameterBlock['message0'] += " : %2";
        realParameterBlock['args0'].push({"type": "input_value", "name": "TYPE"});
    }
    if (parameterDefault) {
        realParameterBlock['message0'] += " = %" + (parameterTyped ? 3 : 2);
        realParameterBlock['args0'].push({"type": "input_value", "name": "DEFAULT"});
    }
    BlockMirrorTextToBlocks.BLOCKS.push(realParameterBlock);

    python.pythonGenerator.forBlock["ast_Function" + parameterType] = function (block) {
        let name = python.pythonGenerator.getVariableName(block.getFieldValue('NAME'),
            Blockly.Variables.NAME_TYPE);
        let typed = "";
        if (parameterTyped) {
            typed = ": " + (python.pythonGenerator.valueToCode(block, 'TYPE',
                python.pythonGenerator.ORDER_NONE) || python.pythonGenerator.blank);
        }
        let defaulted = "";
        if (parameterDefault) {
            defaulted = "=" + (python.pythonGenerator.valueToCode(block, 'DEFAULT',
                python.pythonGenerator.ORDER_NONE) || python.pythonGenerator.blank);
        }
        return [parameterPrefix + name + typed + defaulted, python.pythonGenerator.ORDER_ATOMIC];
    }
});

// TODO: Figure out an elegant "complexity" flag feature to allow different levels of Mutators

Blockly.Blocks['ast_FunctionDef'] = {
    init: function () {
        this.appendDummyInput()
            .appendField("define")
            .appendField(new Blockly.FieldTextInput("function"), "NAME");
        this.decoratorsCount_ = 0;
        this.parametersCount_ = 0;
        this.hasReturn_ = false;
        this.mutatorComplexity_ = 0;
        this.appendStatementInput("BODY")
            .setCheck(null);
        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(BlockMirrorTextToBlocks.COLOR.FUNCTIONS);
        this.updateShape_();
        this.setMutator(new Blockly.icons.MutatorIcon(['ast_FunctionMutantParameter',
            'ast_FunctionMutantParameterType'], this));
    },
    /**
     * Create XML to represent list inputs.
     * @return {!Element} XML storage element.
     * @this Blockly.Block
     */
    mutationToDom: function () {
        var container = document.createElement('mutation');
        container.setAttribute('decorators', this.decoratorsCount_);
        container.setAttribute('parameters', this.parametersCount_);
        container.setAttribute('returns', this.hasReturn_);
        return container;
    },
    /**
     * Parse XML to restore the list inputs.
     * @param {!Element} xmlElement XML storage element.
     * @this Blockly.Block
     */
    domToMutation: function (xmlElement) {
        this.decoratorsCount_ = parseInt(xmlElement.getAttribute('decorators'), 10);
        this.parametersCount_ = parseInt(xmlElement.getAttribute('parameters'), 10);
        this.hasReturn_ = "true" === xmlElement.getAttribute('returns');
        this.updateShape_();
    },
    setReturnAnnotation_: function (status) {
        let currentReturn = this.getInput('RETURNS');
        if (status) {
            if (!currentReturn) {
                this.appendValueInput("RETURNS")
                    .setCheck(null)
                    .setAlign(Blockly.inputs.Align.RIGHT)
                    .appendField("returns");
            }
            this.moveInputBefore('RETURNS', 'BODY');
        } else if (!status && currentReturn) {
            this.removeInput('RETURNS');
        }
        this.hasReturn_ = status;
    },
    updateShape_: function () {
        // Set up decorators and parameters
        let block = this;
        let position = 1;
        [
            ['DECORATOR', 'decoratorsCount_', null, 'decorated by'],
            ['PARAMETER', 'parametersCount_', 'Parameter', 'parameters:']
        ].forEach(function (childTypeTuple) {
            let childTypeName = childTypeTuple[0],
                countVariable = childTypeTuple[1],
                inputCheck = childTypeTuple[2],
                childTypeMessage = childTypeTuple[3];
            for (var i = 0; i < block[countVariable]; i++) {
                if (!block.getInput(childTypeName + i)) {
                    let input = block.appendValueInput(childTypeName + i)
                        .setCheck(inputCheck)
                        .setAlign(Blockly.inputs.Align.RIGHT);
                    if (i === 0) {
                        input.appendField(childTypeMessage);
                    }
                }
                block.moveInputBefore(childTypeName + i, 'BODY');
            }
            // Remove deleted inputs.
            while (block.getInput(childTypeName + i)) {
                block.removeInput(childTypeName + i);
                i++;
            }
        });
        // Set up optional Returns annotation
        this.setReturnAnnotation_(this.hasReturn_);
    },
    /**
     * Populate the mutator's dialog with this block's components.
     * @param {!Blockly.Workspace} workspace Mutator's workspace.
     * @return {!Blockly.Block} Root block in mutator.
     * @this Blockly.Block
     */
    decompose: function (workspace) {
        var containerBlock = workspace.newBlock('ast_FunctionHeaderMutator');
        containerBlock.initSvg();

        // Check/uncheck the allow statement box.
        if (this.getInput('RETURNS')) {
            containerBlock.setFieldValue(
                this.hasReturn_ ? 'TRUE' : 'FALSE', 'RETURNS');
        } else {
            // TODO: set up "canReturns" for lambda mode
            //containerBlock.getField('RETURNS').setVisible(false);
        }

        // Set up parameters
        var connection = containerBlock.getInput('STACK').connection;
        let parameters = [];
        for (var i = 0; i < this.parametersCount_; i++) {
            let parameter = this.getInput('PARAMETER' + i).connection;
            let sourceType = parameter.targetConnection.getSourceBlock().type;
            let createName = 'ast_FunctionMutant' + sourceType.substring('ast_Function'.length);
            var itemBlock = workspace.newBlock(createName);
            itemBlock.initSvg();
            connection.connect(itemBlock.previousConnection);
            connection = itemBlock.nextConnection;
            parameters.push(itemBlock);
        }
        return containerBlock;
    },
    /**
     * Reconfigure this block based on the mutator dialog's components.
     * @param {!Blockly.Block} containerBlock Root block in mutator.
     * @this Blockly.Block
     */
    compose: function (containerBlock) {
        var itemBlock = containerBlock.getInputTargetBlock('STACK');
        // Count number of inputs.
        var connections = [];
        let blockTypes = [];
        while (itemBlock) {
            connections.push(itemBlock.valueConnection_);
            blockTypes.push(itemBlock.type);
            itemBlock = itemBlock.nextConnection &&
                itemBlock.nextConnection.targetBlock();
        }
        // Disconnect any children that don't belong.
        for (let i = 0; i < this.parametersCount_; i++) {
            var connection = this.getInput('PARAMETER' + i).connection.targetConnection;
            if (connection && connections.indexOf(connection) === -1) {
                // Disconnect all children of this block
                let connectedBlock = connection.getSourceBlock();
                for (let j = 0; j < connectedBlock.inputList.length; j++) {
                    let field = connectedBlock.inputList[j].connection;
                    if (field && field.targetConnection) {
                        field.targetConnection.getSourceBlock().unplug(true);
                    }
                }
                connection.disconnect();
                connection.getSourceBlock().dispose();
            }
        }
        this.parametersCount_ = connections.length;
        this.updateShape_();
        // Reconnect any child blocks.
        for (let i = 0; i < this.parametersCount_; i++) {
            connections[i]?.reconnect(this, 'PARAMETER' + i);
            if (!connections[i]) {
                let createName = 'ast_Function' + blockTypes[i].substring('ast_FunctionMutant'.length);
                let itemBlock = this.workspace.newBlock(createName);
                itemBlock.setDeletable(false);
                itemBlock.setMovable(false);
                itemBlock.initSvg();
                this.getInput('PARAMETER' + i).connection.connect(itemBlock.outputConnection);
                itemBlock.render();
                //this.get(itemBlock, 'ADD'+i)
            }
        }
        // Show/hide the returns annotation
        let hasReturns = containerBlock.getFieldValue('RETURNS');
        if (hasReturns !== null) {
            hasReturns = hasReturns === 'TRUE';
            if (this.hasReturn_ != hasReturns) {
                if (hasReturns) {
                    this.setReturnAnnotation_(true);
                    this.returnConnection_?.reconnect(this, 'RETURNS');
                    this.returnConnection_ = null;
                } else {
                    let returnConnection = this.getInput('RETURNS').connection
                    this.returnConnection_ = returnConnection.targetConnection;
                    if (this.returnConnection_) {
                        let returnBlock = returnConnection.targetBlock();
                        returnBlock.unplug();
                        returnBlock.bumpNeighbours_();
                    }
                    this.setReturnAnnotation_(false);
                }
            }
        }
    },
    /**
     * Store pointers to any connected child blocks.
     * @param {!Blockly.Block} containerBlock Root block in mutator.
     * @this Blockly.Block
     */
    saveConnections: function (containerBlock) {
        var itemBlock = containerBlock.getInputTargetBlock('STACK');
        var i = 0;
        while (itemBlock) {
            var input = this.getInput('PARAMETER' + i);
            itemBlock.valueConnection_ = input && input.connection.targetConnection;
            i++;
            itemBlock = itemBlock.nextConnection &&
                itemBlock.nextConnection.targetBlock();
        }
    },
};

python.pythonGenerator.forBlock['ast_FunctionDef'] = function(block, generator) {
    // Name
    let name = python.pythonGenerator.getVariableName(block.getFieldValue('NAME'), Blockly.Variables.NAME_TYPE);
    // Decorators
    let decorators = new Array(block.decoratorsCount_);
    for (let i = 0; i < block.decoratorsCount_; i++) {
        let decorator = (python.pythonGenerator.valueToCode(block, 'DECORATOR' + i, python.pythonGenerator.ORDER_NONE) ||
            python.pythonGenerator.blank);
        decorators[i] = "@" + decorator + "\n";
    }
    // Parameters
    let parameters = new Array(block.parametersCount_);
    for (let i = 0; i < block.parametersCount_; i++) {
        parameters[i] = (python.pythonGenerator.valueToCode(block, 'PARAMETER' + i, python.pythonGenerator.ORDER_NONE) ||
            python.pythonGenerator.blank);
    }
    // Return annotation
    let returns = "";
    if (this.hasReturn_) {
        returns = " -> " + python.pythonGenerator.valueToCode(block, 'RETURNS', python.pythonGenerator.ORDER_NONE) ||
            python.pythonGenerator.blank;
    }
    // Body
    let body = python.pythonGenerator.statementToCode(block, 'BODY') || python.pythonGenerator.PASS;
    return decorators.join('') + "def " + name + "(" + parameters.join(', ') + ")" + returns + ":\n" + body;
};

BlockMirrorTextToBlocks.prototype.parseArg = function (arg, type, lineno, values, node) {
    let settings = {
        "movable": false,
        "deletable": false
    };
    if (arg.annotation === null) {
        return BlockMirrorTextToBlocks.create_block(type,
            lineno, {'NAME': Sk.ffi.remapToJs(arg.arg)}, values, settings);
    } else {
        values['TYPE'] = this.convert(arg.annotation, node);
        return BlockMirrorTextToBlocks.create_block(type + "Type",
            lineno, {'NAME': Sk.ffi.remapToJs(arg.arg)}, values, settings);
    }
};

BlockMirrorTextToBlocks.prototype.parseArgs = function (args, values, lineno, node) {
    let positional = args.args,
        vararg = args.vararg,
        kwonlyargs = args.kwonlyargs,
        kwarg = args.kwarg,
        defaults = args.defaults,
        kw_defaults = args.kw_defaults;
    let totalArgs = 0;
    // args (positional)
    if (positional !== null) {
        // "If there are fewer defaults, they correspond to the last n arguments."
        let defaultOffset = defaults ? defaults.length - positional.length : 0;
        for (let i = 0; i < positional.length; i++) {
            let childValues = {};
            let type = 'ast_FunctionParameter';
            if (defaults[defaultOffset + i]) {
                childValues['DEFAULT'] = this.convert(defaults[defaultOffset + i], node);
                type += "Default";
            }
            values['PARAMETER' + totalArgs] = this.parseArg(positional[i], type, lineno, childValues, node);
            totalArgs += 1;
        }
    }
    // *arg
    if (vararg !== null) {
        values['PARAMETER' + totalArgs] = this.parseArg(vararg, 'ast_FunctionParameterVararg', lineno, {}, node);
        totalArgs += 1;
    }
    // keyword arguments that must be referenced by name
    if (kwonlyargs !== null) {
        for (let i = 0; i < kwonlyargs.length; i++) {
            let childValues = {};
            let type = 'ast_FunctionParameter';
            if (kw_defaults[i]) {
                childValues['DEFAULT'] = this.convert(kw_defaults[i], node);
                type += "Default";
            }
            values['PARAMETER' + totalArgs] = this.parseArg(kwonlyargs[i], type, lineno, childValues, node);
            totalArgs += 1;
        }
    }
    // **kwarg
    if (kwarg) {
        values['PARAMETER' + totalArgs] = this.parseArg(kwarg, 'ast_FunctionParameterKwarg', lineno, {}, node);
        totalArgs += 1;
    }

    return totalArgs;
};

BlockMirrorTextToBlocks.prototype['ast_FunctionDef'] = function (node, parent) {
    let name = node.name;
    let args = node.args;
    let body = node.body;
    let decorator_list = node.decorator_list;
    let returns = node.returns;

    let values = {};

    if (decorator_list !== null) {
        for (let i = 0; i < decorator_list.length; i++) {
            values['DECORATOR' + i] = this.convert(decorator_list[i], node);
        }
    }

    let parsedArgs = 0;
    if (args !== null) {
        parsedArgs = this.parseArgs(args, values, node.lineno, node);
    }

    let hasReturn = (returns !== null &&
        (returns._astname !== 'NameConstant' || returns.value !== Sk.builtin.none.none$));
    if (hasReturn) {
        values['RETURNS'] = this.convert(returns, node);
    }

    return BlockMirrorTextToBlocks.create_block("ast_FunctionDef", node.lineno, {
            'NAME': Sk.ffi.remapToJs(name)
        },
        values,
        {
            "inline": "false"
        }, {
            "@decorators": (decorator_list === null ? 0 : decorator_list.length),
            "@parameters": parsedArgs,
            "@returns": hasReturn,
        }, {
            'BODY': this.convertBody(body, node)
        });
};
Blockly.Blocks['ast_Global'] = {
    init: function () {
        this.setInputsInline(true);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(BlockMirrorTextToBlocks.COLOR.VARIABLES);
        this.nameCount_ = 1;
        this.appendDummyInput('GLOBAL')
            .appendField("make global", "START_GLOBALS");
        this.updateShape_();
    },
    updateShape_: function () {
        let input = this.getInput("GLOBAL");
        // Update pluralization
        if (this.getField('START_GLOBALS')) {
            this.setFieldValue(this.nameCount_ > 1 ? "make globals" : "make global", "START_GLOBALS");
        }
        // Update fields
        for (var i = 0; i < this.nameCount_; i++) {
            if (!this.getField('NAME' + i)) {
                if (i !== 0) {
                    input.appendField(',').setAlign(Blockly.inputs.Align.RIGHT);
                }
                input.appendField(new Blockly.FieldVariable("variable"), 'NAME' + i);
            }
        }
        // Remove deleted fields.
        while (this.getField('NAME' + i)) {
            input.removeField('NAME' + i);
            i++;
        }
        // Delete and re-add ending field
        if (this.getField("END_GLOBALS")) {
            input.removeField("END_GLOBALS");
        }
        input.appendField("available", "END_GLOBALS");
    },
    /**
     * Create XML to represent list inputs.
     * @return {!Element} XML storage element.
     * @this Blockly.Block
     */
    mutationToDom: function () {
        var container = document.createElement('mutation');
        container.setAttribute('names', this.nameCount_);
        return container;
    },
    /**
     * Parse XML to restore the list inputs.
     * @param {!Element} xmlElement XML storage element.
     * @this Blockly.Block
     */
    domToMutation: function (xmlElement) {
        this.nameCount_ = parseInt(xmlElement.getAttribute('names'), 10);
        this.updateShape_();
    },
};

python.pythonGenerator.forBlock['ast_Global'] = function(block, generator) {
    // Create a list with any number of elements of any type.
    let elements = new Array(block.nameCount_);
    for (let i = 0; i < block.nameCount_; i++) {
        elements[i] = python.pythonGenerator.getVariableName(block.getFieldValue('NAME' + i), Blockly.Variables.NAME_TYPE);
    }
    return 'global ' + elements.join(', ') + "\n";
};

BlockMirrorTextToBlocks.prototype['ast_Global'] = function (node, parent) {
    let names = node.names;

    let fields = {};
    for (var i = 0; i < names.length; i++) {
        fields["NAME" + i] = Sk.ffi.remapToJs(names[i]);
    }

    return BlockMirrorTextToBlocks.create_block("ast_Global", node.lineno,
        fields,
        {}, {
            "inline": "true",
        }, {
            "@names": names.length
        });
};Blockly.Blocks['ast_If'] = {
    init: function () {
        this.orelse_ = 0;
        this.elifs_ = 0;
        this.appendValueInput('TEST')
            .appendField("if");
        this.appendStatementInput("BODY")
            .setCheck(null)
            .setAlign(Blockly.inputs.Align.RIGHT);
        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(BlockMirrorTextToBlocks.COLOR.LOGIC);
        this.updateShape_();
    },
    // TODO: Not mutable currently
    updateShape_: function () {
        let latestInput = "BODY";
        for (var i = 0; i < this.elifs_; i++) {
            if (!this.getInput('ELIF' + i)) {
                this.appendValueInput('ELIFTEST' + i)
                    .appendField('elif');
                this.appendStatementInput("ELIFBODY" + i)
                    .setCheck(null);
            }
        }
        // Remove deleted inputs.
        while (this.getInput('ELIFTEST' + i)) {
            this.removeInput('ELIFTEST' + i);
            this.removeInput('ELIFBODY' + i);
            i++;
        }

        if (this.orelse_ && !this.getInput('ELSE')) {
            this.appendDummyInput('ORELSETEST')
                .appendField("else:");
            this.appendStatementInput("ORELSEBODY")
                .setCheck(null);
        } else if (!this.orelse_ && this.getInput('ELSE')) {
            block.removeInput('ORELSETEST');
            block.removeInput('ORELSEBODY');
        }

        for (i = 0; i < this.elifs_; i++) {
            if (this.orelse_) {
                this.moveInputBefore('ELIFTEST' + i, 'ORELSETEST');
                this.moveInputBefore('ELIFBODY' + i, 'ORELSETEST');
            } else if (i+1 < this.elifs_) {
                this.moveInputBefore('ELIFTEST' + i, 'ELIFTEST' + (i+1));
                this.moveInputBefore('ELIFBODY' + i, 'ELIFBODY' + (i+1));
            }
        }
    },
    /**
     * Create XML to represent the (non-editable) name and arguments.
     * @return {!Element} XML storage element.
     * @this Blockly.Block
     */
    mutationToDom: function () {
        let container = document.createElement('mutation');
        container.setAttribute('orelse', this.orelse_);
        container.setAttribute('elifs', this.elifs_);
        return container;
    },
    /**
     * Parse XML to restore the (non-editable) name and parameters.
     * @param {!Element} xmlElement XML storage element.
     * @this Blockly.Block
     */
    domToMutation: function (xmlElement) {
        this.orelse_ = "true" === xmlElement.getAttribute('orelse');
        this.elifs_ = parseInt(xmlElement.getAttribute('elifs'), 10) || 0;
        this.updateShape_();
    },
};

python.pythonGenerator.forBlock['ast_If'] = function(block, generator) {
    // Test
    let test = "if " + (python.pythonGenerator.valueToCode(block, 'TEST',
        python.pythonGenerator.ORDER_NONE) || python.pythonGenerator.blank) + ":\n";
    // Body:
    let body = python.pythonGenerator.statementToCode(block, 'BODY') || python.pythonGenerator.PASS;
    // Elifs
    let elifs = new Array(block.elifs_);
    for (let i = 0; i < block.elifs_; i++) {
        let elif = block.elifs_[i];
        let clause = "elif " + (python.pythonGenerator.valueToCode(block, 'ELIFTEST' + i,
            python.pythonGenerator.ORDER_NONE) || python.pythonGenerator.blank);
        clause += ":\n" + (python.pythonGenerator.statementToCode(block, 'ELIFBODY' + i) || python.pythonGenerator.PASS);
        elifs[i] = clause;
    }
    // Orelse:
    let orelse = "";
    if (this.orelse_) {
        orelse = "else:\n" + (python.pythonGenerator.statementToCode(block, 'ORELSEBODY') || python.pythonGenerator.PASS);
    }
    return test + body + elifs.join("") + orelse;
};

BlockMirrorTextToBlocks.prototype['ast_If'] = function (node, parent) {
    let test = node.test;
    let body = node.body;
    let orelse = node.orelse;

    let hasOrelse = false;
    let elifCount = 0;

    let values = {"TEST": this.convert(test, node)};
    let statements = {"BODY": this.convertBody(body, node)};

    while (orelse !== undefined && orelse.length > 0) {
        if (orelse.length === 1) {
            if (orelse[0]._astname === "If") {
                // This is an ELIF
                this.heights.shift();
                values['ELIFTEST' + elifCount] = this.convert(orelse[0].test, node);
                statements['ELIFBODY' + elifCount] = this.convertBody(orelse[0].body, node);
                elifCount++;
            } else {
                hasOrelse = true;
                statements['ORELSEBODY'] = this.convertBody(orelse, node);
            }
        } else {
            hasOrelse = true;
            statements['ORELSEBODY'] = this.convertBody(orelse, node);
        }
        orelse = orelse[0].orelse;
    }

    return BlockMirrorTextToBlocks.create_block("ast_If", node.lineno, {},
        values, {}, {
            "@orelse": hasOrelse,
            "@elifs": elifCount
        }, statements);
};BlockMirrorTextToBlocks.BLOCKS.push({
    "type": "ast_IfExp",
    "message0": "%1 if %2 else %3",
    "args0": [
        {"type": "input_value", "name": "BODY"},
        {"type": "input_value", "name": "TEST"},
        {"type": "input_value", "name": "ORELSE"}
    ],
    "inputsInline": true,
    "output": null,
    "colour": BlockMirrorTextToBlocks.COLOR.LOGIC
});

python.pythonGenerator.forBlock['ast_IfExp'] = function(block, generator) {
    var test = python.pythonGenerator.valueToCode(block, 'TEST', python.pythonGenerator.ORDER_CONDITIONAL) || python.pythonGenerator.blank;
    var body = python.pythonGenerator.valueToCode(block, 'BODY', python.pythonGenerator.ORDER_CONDITIONAL) || python.pythonGenerator.blank;
    var orelse = python.pythonGenerator.valueToCode(block, 'ORELSE', python.pythonGenerator.ORDER_CONDITIONAL) || python.pythonGenerator.blank;
    return [body + " if " + test + " else " + orelse + "\n", python.pythonGenerator.ORDER_CONDITIONAL];
};

BlockMirrorTextToBlocks.prototype['ast_IfExp'] = function (node, parent) {
    let test = node.test;
    let body = node.body;
    let orelse = node.orelse;

    return BlockMirrorTextToBlocks.create_block("ast_IfExp", node.lineno, {}, {
        "TEST": this.convert(test, node),
        "BODY": this.convert(body, node),
        "ORELSE": this.convert(orelse, node)
    });
};// TODO: direct imports are not variables, because you can do stuff like:
//         import os.path
//       What should the variable be? Blockly will mangle it, but we should really be
//       doing something more complicated here with namespaces (probably make `os` the
//       variable and have some kind of list of attributes. But that's in the fading zone.
Blockly.Blocks['ast_Import'] = {
    init: function () {
        this.nameCount_ = 1;
        this.from_ = false;
        this.regulars_ = [true];
        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(BlockMirrorTextToBlocks.COLOR.PYTHON);
        this.updateShape_();
    },
    // TODO: Not mutable currently
    updateShape_: function () {
        // Possible FROM part
        if (this.from_ && !this.getInput('FROM')) {
            this.appendDummyInput('FROM')
                .setAlign(Blockly.inputs.Align.RIGHT)
                .appendField('from')
                .appendField(new Blockly.FieldTextInput("module"), "MODULE");
        } else if (!this.from_ && this.getInput('FROM')) {
            this.removeInput('FROM');
        }
        // Import clauses
        for (var i = 0; i < this.nameCount_; i++) {
            let input = this.getInput('CLAUSE' + i);
            if (!input) {
                input = this.appendDummyInput('CLAUSE' + i)
                    .setAlign(Blockly.inputs.Align.RIGHT);
                if (i === 0) {
                    input.appendField("import");
                }
                input.appendField(new Blockly.FieldTextInput("default"), "NAME" + i)
            }
            if (this.regulars_[i] && this.getField('AS' + i)) {
                input.removeField('AS' + i);
                input.removeField('ASNAME' + i);
            } else if (!this.regulars_[i] && !this.getField('AS' + i)) {
                input.appendField("as", 'AS' + i)
                    .appendField(new Blockly.FieldVariable("alias"), "ASNAME" + i);
            }
        }
        // Remove deleted inputs.
        while (this.getInput('CLAUSE' + i)) {
            this.removeInput('CLAUSE' + i);
            i++;
        }
        // Reposition everything
        if (this.from_ && this.nameCount_ > 0) {
            this.moveInputBefore('FROM', 'CLAUSE0');
        }
        for (i = 0; i + 1 < this.nameCount_; i++) {
            this.moveInputBefore('CLAUSE' + i, 'CLAUSE' + (i + 1));
        }
    },
    /**
     * Create XML to represent the (non-editable) name and arguments.
     * @return {!Element} XML storage element.
     * @this Blockly.Block
     */
    mutationToDom: function () {
        let container = document.createElement('mutation');
        container.setAttribute('names', this.nameCount_);
        container.setAttribute('from', this.from_);
        for (let i = 0; i < this.nameCount_; i++) {
            let parameter = document.createElement('regular');
            parameter.setAttribute('name', this.regulars_[i]);
            container.appendChild(parameter);
        }
        return container;
    },
    /**
     * Parse XML to restore the (non-editable) name and parameters.
     * @param {!Element} xmlElement XML storage element.
     * @this Blockly.Block
     */
    domToMutation: function (xmlElement) {
        this.nameCount_ = parseInt(xmlElement.getAttribute('names'), 10);
        this.from_ = "true" === xmlElement.getAttribute('from');
        this.regulars_ = [];
        for (let i = 0, childNode; childNode = xmlElement.childNodes[i]; i++) {
            if (childNode.nodeName.toLowerCase() === 'regular') {
                this.regulars_.push("true" === childNode.getAttribute('name'));
            }
        }
        this.updateShape_();
    },
};

python.pythonGenerator.forBlock['ast_Import'] = function(block, generator) {
    // Optional from part
    let from = "";
    if (this.from_) {
        let moduleName = block.getFieldValue('MODULE');
        from = "from "+moduleName + " ";
        python.pythonGenerator.imported_["import_" + moduleName] = moduleName;
    }
    // Create a list with any number of elements of any type.
    let elements = new Array(block.nameCount_);
    for (let i = 0; i < block.nameCount_; i++) {
        let name = block.getFieldValue('NAME' + i);
        elements[i] = name;
        if (!this.regulars_[i]) {
            name = python.pythonGenerator.getVariableName(block.getFieldValue('ASNAME' + i), Blockly.Variables.NAME_TYPE);
            elements[i] += " as " + name;
        }
        if (!from) {
            python.pythonGenerator.imported_["import_" + name] = name;
        }
    }
    return from + 'import ' + elements.join(', ') + "\n";
};

BlockMirrorTextToBlocks.prototype['ast_Import'] = function (node, parent) {
    let names = node.names;

    let fields = {};
    let mutations = {'@names': names.length};

    let regulars = [];
    let simpleName = "";
    for (let i = 0; i < names.length; i++) {
        fields["NAME" + i] = Sk.ffi.remapToJs(names[i].name);
        let isRegular = (names[i].asname === null);
        if (!isRegular) {
            fields["ASNAME" + i] = Sk.ffi.remapToJs(names[i].asname);
            simpleName = fields["ASNAME"+i];
        } else {
            simpleName = fields["NAME"+i];
        }
        regulars.push(isRegular);
    }
    mutations['regular'] = regulars;

    if (this.hiddenImports.indexOf(simpleName) !== -1) {
        return null;
    }

    if (node._astname === 'ImportFrom') {
        // acbart: GTS suggests module can be None for '.' but it's an empty string in Skulpt
        mutations['@from'] = true;
        fields['MODULE'] = ('.'.repeat(node.level)) + Sk.ffi.remapToJs(node.module);
    } else {
        mutations['@from'] = false;
    }

    return BlockMirrorTextToBlocks.create_block("ast_Import", node.lineno, fields,
        {}, {"inline": true}, mutations);
};

// Alias ImportFrom because of big overlap
BlockMirrorTextToBlocks.prototype['ast_ImportFrom'] = BlockMirrorTextToBlocks.prototype['ast_Import'];
BlockMirrorTextToBlocks.BLOCKS.push({
    "type": "ast_FormattedValue",
    "message0": "%1",
    "args0": [
        {"type": "input_value", "name": "VALUE"}
    ],
    "output": "FormattedValueStr",
    "inputsInline": false,
    "colour": BlockMirrorTextToBlocks.COLOR.TEXT,
});

BlockMirrorTextToBlocks.BLOCKS.push({
    "type": "ast_JoinedStrStr",
    "message0": "%1",
    "args0": [
        {"type": "field_input", "name": "TEXT", "value": ''}
    ],
    "output": "FormattedValueStr",
    "inputsInline": false,
    "colour": BlockMirrorTextToBlocks.COLOR.TEXT,
});

BlockMirrorTextToBlocks.BLOCKS.push({
        "type": "ast_FormattedValueFull",
        "tooltip": "",
        "helpUrl": "",
        "message0": "%1 : %2 ! %3 %4",
        "args0": [
            {
                "type": "input_value",
                "name": "VALUE"
            },
            {
                "type": "field_input",
                "name": "FORMAT_SPEC",
                "text": ""
            },
            {
                "type": "field_dropdown",
                "name": "CONVERSION",
                "options": [
                    [
                        "plain",
                        "-1"
                    ],
                    [
                        "repr",
                        "r"
                    ],
                    [
                        "str",
                        "s"
                    ],
                    [
                        "ascii",
                        "a"
                    ]
                ]
            },
            {
                "type": "input_dummy",
                "name": "NAME"
            }
        ],
        "output": "FormattedValueStr",
        "colour": BlockMirrorTextToBlocks.COLOR.TEXT
    }
);

Blockly.Blocks["ast_JoinedStr"] = {
    /**
     * Block for JoinedStr and FormattedValue
     */
    init: function () {
        this.setColour(BlockMirrorTextToBlocks.COLOR.TEXT);
        this.itemCount_ = 3;
        this.updateShape_();
        this.setInputsInline(true);
        this.setOutput(true, "String");
        this.setMutator(
            new Blockly.icons.MutatorIcon(["ast_JoinedStr_create_with_item_S",
            "ast_JoinedStr_create_with_item_FV","ast_JoinedStr_create_with_item_FVF"], this),
        );
    },

    /**
   * Create XML to represent dict inputs.
   * @return {!Element} XML storage element.
   * @this Blockly.Block
   */
  mutationToDom: function () {
    var container = document.createElement("mutation");
    container.setAttribute("items", this.itemCount_);
    return container;
  },

    /**
   * Parse XML to restore the dict inputs.
   * @param {!Element} xmlElement XML storage element.
   * @this Blockly.Block
   */
  domToMutation: function (xmlElement) {
    this.itemCount_ = parseInt(xmlElement.getAttribute("items"), 10);
    this.updateShape_();
  },

    /**
   * Populate the mutator's dialog with this block's components.
   * @param {!Blockly.Workspace} workspace Mutator's workspace.
   * @return {!Blockly.Block} Root block in mutator.
   * @this Blockly.Block
   */
  decompose: function (workspace) {
    var containerBlock = workspace.newBlock("ast_JoinedStr_create_with_container");
    containerBlock.initSvg();
    var connection = containerBlock.getInput("STACK").connection;
    for (var i = 0; i < this.itemCount_; i++) {
        const piece = this.getInput("ADD" + i).connection;
        const pieceType = piece.targetConnection.getSourceBlock().type;
        // console.log(piece, pieceType);
        const createName = pieceType === "ast_JoinedStrStr" ?
            "ast_JoinedStr_create_with_item_S" :
              pieceType === "ast_FormattedValueFull" ? "ast_JoinedStr_create_with_item_FVF" : "ast_JoinedStr_create_with_item_FV";
      var itemBlock = workspace.newBlock(createName);
      itemBlock.initSvg();
      connection.connect(itemBlock.previousConnection);
      connection = itemBlock.nextConnection;
    }
    return containerBlock;
  },

    /**
   * Reconfigure this block based on the mutator dialog's components.
   * @param {!Blockly.Block} containerBlock Root block in mutator.
   * @this Blockly.Block
   */
  compose: function (containerBlock) {
    var itemBlock = containerBlock.getInputTargetBlock("STACK");
    // Count number of inputs.
    var connections = [];
        let blockTypes = [];
    while (itemBlock) {
      connections.push(itemBlock.valueConnection_);
      blockTypes.push(itemBlock.type);
      itemBlock =
        itemBlock.nextConnection && itemBlock.nextConnection.targetBlock();
    }
    // Disconnect any children that don't belong.
    for (var i = 0; i < this.itemCount_; i++) {
      var connection = this.getInput("ADD" + i).connection.targetConnection;
      if (connection && connections.indexOf(connection) == -1) {
        let value = connection.getSourceBlock().getInput("VALUE");
        if (value && value.connection.targetConnection) {
          value.connection.targetConnection.getSourceBlock().unplug(true);
        }
        connection.disconnect();
        connection.getSourceBlock().dispose();
      }
    }
    this.itemCount_ = connections.length;
    this.updateShape_();
    // Reconnect any child blocks.
    for (var i = 0; i < this.itemCount_; i++) {
      connections[i]?.reconnect(this, "ADD" + i);
      if (!connections[i]) {
          const createName = blockTypes[i] === "ast_JoinedStr_create_with_item_S" ? "ast_JoinedStrStr" :
              blockTypes[i] === "ast_JoinedStr_create_with_item_FVF" ? "ast_FormattedValueFull" : "ast_FormattedValue";
        let itemBlock = this.workspace.newBlock(createName);
        itemBlock.setDeletable(false);
        itemBlock.setMovable(false);
        itemBlock.initSvg();
        this.getInput("ADD" + i).connection.connect(itemBlock.outputConnection);
        itemBlock.render();
        //this.get(itemBlock, 'ADD'+i)
      }
    }
  },

    /**
   * Store pointers to any connected child blocks.
   * @param {!Blockly.Block} containerBlock Root block in mutator.
   * @this Blockly.Block
   */
  saveConnections: function (containerBlock) {
    var itemBlock = containerBlock.getInputTargetBlock("STACK");
    var i = 0;
    while (itemBlock) {
      var input = this.getInput("ADD" + i);
      itemBlock.valueConnection_ = input && input.connection.targetConnection;
      i++;
      itemBlock =
        itemBlock.nextConnection && itemBlock.nextConnection.targetBlock();
    }
  },

  /**
   * Modify this block to have the correct number of inputs.
   * @private
   * @this Blockly.Block
   */
  updateShape_: function () {
    if (this.itemCount_ && this.getInput("EMPTY")) {
      this.removeInput("EMPTY");
    } else if (!this.itemCount_ && !this.getInput("EMPTY")) {
      this.appendDummyInput("EMPTY").appendField("empty string");
    }
    // Add new inputs.
    for (var i = 0; i < this.itemCount_; i++) {
      if (!this.getInput("ADD" + i)) {
        var input = this.appendValueInput("ADD" + i).setCheck("FormattedValueStr");
        if (i === 0) {
          input
            .appendField("Join:")
            .setAlign(Blockly.inputs.Align.RIGHT);
        }
      }
    }
    // Remove deleted inputs.
    while (this.getInput("ADD" + i)) {
      this.removeInput("ADD" + i);
      i++;
    }
    // Add the trailing "}"
    /*
        if (this.getInput('TAIL')) {
            this.removeInput('TAIL');
        }
        if (this.itemCount_) {
            let tail = this.appendDummyInput('TAIL')
                .appendField('}');
            tail.setAlign(Blockly.inputs.Align.RIGHT);
        }*/
  },
}


Blockly.Blocks["ast_JoinedStr_create_with_container"] = {
  /**
   * Mutator block for JoinedStr container.
   * @this Blockly.Block
   */
  init: function () {
    this.setColour(BlockMirrorTextToBlocks.COLOR.TEXT);
    this.appendDummyInput().appendField("Add new values and strings below");
    this.appendStatementInput("STACK");
    this.contextMenu = false;
  },
};

Blockly.Blocks["ast_JoinedStr_create_with_item_S"] = {
  /**
   * Mutator block for adding items.
   * @this Blockly.Block
   */
  init: function () {
    this.setColour(BlockMirrorTextToBlocks.COLOR.TEXT);
    this.appendDummyInput().appendField("Text");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.contextMenu = false;
  },
};

Blockly.Blocks["ast_JoinedStr_create_with_item_FV"] = {
  /**
   * Mutator block for adding items.
   * @this Blockly.Block
   */
  init: function () {
    this.setColour(BlockMirrorTextToBlocks.COLOR.VARIABLES);
    this.appendDummyInput().appendField("Expression");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.contextMenu = false;
  },
};

Blockly.Blocks["ast_JoinedStr_create_with_item_FVF"] = {
  /**
   * Mutator block for adding items.
   * @this Blockly.Block
   */
  init: function () {
    this.setColour(BlockMirrorTextToBlocks.COLOR.VARIABLES);
    this.appendDummyInput().appendField("Formatted Expression");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.contextMenu = false;
  },
};

python.pythonGenerator.forBlock["ast_JoinedStr"] = function (block, generator) {
  // Create a dict with any number of elements of any type.
  var elements = new Array(block.itemCount_);
  const strings = [];
  const indices = [];
  for (var i = 0; i < block.itemCount_; i++) {
    let child = block.getInputTargetBlock("ADD" + i);
    if (child === null || (child.type != "ast_JoinedStrStr" && child.type != "ast_FormattedValue" && child.type != "ast_FormattedValueFull")) {
      elements[i] = python.pythonGenerator.blank;
      continue;
    }
    if (child.type === "ast_JoinedStrStr") {
        let value = child.getFieldValue("TEXT") || generator.blank;
        elements[i] = value;
        indices.push(i);
        strings.push(value);
    } else if (child.type === "ast_FormattedValue") {
        let value = generator.valueToCode(child, "VALUE", generator.ORDER_NONE) || generator.blank;
        elements[i] = `{${value}}`;
    } else if (child.type === "ast_FormattedValueFull") {
        let value = generator.valueToCode(child, "VALUE", generator.ORDER_NONE) || generator.blank;
        let formatSpec = child.getFieldValue("FORMAT_SPEC");
        formatSpec = formatSpec ? `:${formatSpec}` : "";
        let conversion = child.getFieldValue("CONVERSION");
        elements[i] = `{${value}${formatSpec}${conversion === "-1" ? "" : `!${conversion}`}}`;
    }
  }

  let code;
  if (strings.some(s => s.includes("\n"))) {
      indices.forEach(i => {
          elements[i] = elements[i].replace(/'''/g, '\\\'\\\'\\\'');
      })
      code = "f'''" + elements.join("") + "'''";
  } else {
      let quote = '"';
      if (strings.some(s => s.includes("'"))) {
          if (!strings.some(s => s.includes('"'))) {
              quote = "'";
          } else {
              indices.forEach(i => {
                    elements[i] = elements[i].replace(/"/g, '\\"');
              })
          }
      }
      code = "f" + quote + elements.join("") + quote;
  }
  return [code, python.pythonGenerator.ORDER_ATOMIC];
};

BlockMirrorTextToBlocks.prototype["ast_JoinedStr"] = function (node, parent) {
    let values = node.values;
    let elements = {};
    values.forEach((v, i) => {
        if (v._astname === "FormattedValue") {
            // console.log(v);
            if (!v.conversion && !v.format_spec) {
                elements["ADD" + i] = BlockMirrorTextToBlocks.create_block("ast_FormattedValue", v.lineno, {}, {
                    "VALUE": this.convert(v.value, node)
                },
                this.LOCKED_BLOCK);
            } else {
                const format_spec = v.format_spec ? chompExclamation(v.format_spec.values[0].s.v) : "";
                // Can there ever be a non-1 length format_spec?
                elements["ADD" + i] = BlockMirrorTextToBlocks.create_block("ast_FormattedValueFull", v.lineno, {
                    "FORMAT_SPEC": format_spec,
                    "CONVERSION": v.conversion
                }, {
                    "VALUE": this.convert(v.value, node)
                },
                this.LOCKED_BLOCK);
            }
        } else if (v._astname === "Str") {
            const text = Sk.ffi.remapToJs(v.s);
            elements["ADD" + i] = BlockMirrorTextToBlocks.create_block("ast_JoinedStrStr", v.lineno, {
                "TEXT": text
            }, {},
                this.LOCKED_BLOCK);
        }
    });
    return BlockMirrorTextToBlocks.create_block("ast_JoinedStr", node.lineno, {}, elements, { inline: values.length > 3 ? "false" : "true"}, {
        "@items": values.length
    });
}

function chompExclamation(text) {
    // Remove any text starting with an exclamation mark in the text
    return text.replace(/!.*$/, "");
}

function formattedValueConversion(conversion) {
    switch (conversion) {
        case -1:
            return "";
        case 115:
            return "s";
        case 114:
            return "r";
        case 97:
            return "a";
        default: return "";
    }
}Blockly.Blocks['ast_Lambda'] = {
    init: function () {
        this.appendDummyInput()
            .appendField("lambda")
            .setAlign(Blockly.inputs.Align.RIGHT);
        this.decoratorsCount_ = 0;
        this.parametersCount_ = 0;
        this.hasReturn_ = false;
        this.appendValueInput("BODY")
            .appendField("body")
            .setAlign(Blockly.inputs.Align.RIGHT)
            .setCheck(null);
        this.setInputsInline(false);
        this.setOutput(true);
        this.setColour(BlockMirrorTextToBlocks.COLOR.FUNCTIONS);
        this.updateShape_();
    },
    mutationToDom: Blockly.Blocks['ast_FunctionDef'].mutationToDom,
    domToMutation: Blockly.Blocks['ast_FunctionDef'].domToMutation,
    updateShape_: Blockly.Blocks['ast_FunctionDef'].updateShape_,
    setReturnAnnotation_: Blockly.Blocks['ast_FunctionDef'].setReturnAnnotation_,
};

python.pythonGenerator.forBlock['ast_Lambda'] = function(block, generator) {
    // Parameters
    let parameters = new Array(block.parametersCount_);
    for (let i = 0; i < block.parametersCount_; i++) {
        parameters[i] = (python.pythonGenerator.valueToCode(block, 'PARAMETER' + i, python.pythonGenerator.ORDER_NONE) ||
            python.pythonGenerator.blank);
    }
    // Body
    let body = python.pythonGenerator.valueToCode(block, 'BODY', python.pythonGenerator.ORDER_LAMBDA) || python.pythonGenerator.PASS;
    return ["lambda " + parameters.join(', ') + ": " + body, python.pythonGenerator.ORDER_LAMBDA];
};

BlockMirrorTextToBlocks.prototype['ast_Lambda'] = function (node, parent) {
    let args = node.args;
    let body = node.body;

    let values = {'BODY': this.convert(body, node)};

    let parsedArgs = 0;
    if (args !== null) {
        parsedArgs = this.parseArgs(args, values, node.lineno);
    }

    return BlockMirrorTextToBlocks.create_block("ast_Lambda", node.lineno, {},
        values,
        {
            "inline": "false"
        }, {
            "@decorators": 0,
            "@parameters": parsedArgs,
            "@returns": false,
        });
};Blockly.Blocks["ast_List"] = {
  /**
   * Block for creating a list with any number of elements of any type.
   * @this Blockly.Block
   */
  init: function () {
    this.setHelpUrl(Blockly.Msg["LISTS_CREATE_WITH_HELPURL"]);
    this.setColour(BlockMirrorTextToBlocks.COLOR.LIST);
    this.itemCount_ = 3;
    this.updateShape_();
    this.setOutput(true, "List");
    this.setMutator(
      new Blockly.icons.MutatorIcon(["ast_List_create_with_item"], this),
    );
  },
  /**
   * Create XML to represent list inputs.
   * @return {!Element} XML storage element.
   * @this Blockly.Block
   */
  mutationToDom: function () {
    var container = document.createElement("mutation");
    container.setAttribute("items", this.itemCount_);
    return container;
  },
  /**
   * Parse XML to restore the list inputs.
   * @param {!Element} xmlElement XML storage element.
   * @this Blockly.Block
   */
  domToMutation: function (xmlElement) {
    this.itemCount_ = parseInt(xmlElement.getAttribute("items"), 10);
    this.updateShape_();
  },
  /**
   * Populate the mutator's dialog with this block's components.
   * @param {!Blockly.Workspace} workspace Mutator's workspace.
   * @return {!Blockly.Block} Root block in mutator.
   * @this Blockly.Block
   */
  decompose: function (workspace) {
    var containerBlock = workspace.newBlock("ast_List_create_with_container");
    containerBlock.initSvg();
    var connection = containerBlock.getInput("STACK").connection;
    for (var i = 0; i < this.itemCount_; i++) {
      var itemBlock = workspace.newBlock("ast_List_create_with_item");
      itemBlock.initSvg();
      connection.connect(itemBlock.previousConnection);
      connection = itemBlock.nextConnection;
    }
    return containerBlock;
  },
  /**
   * Reconfigure this block based on the mutator dialog's components.
   * @param {!Blockly.Block} containerBlock Root block in mutator.
   * @this Blockly.Block
   */
  compose: function (containerBlock) {
    var itemBlock = containerBlock.getInputTargetBlock("STACK");
    // Count number of inputs.
    var connections = [];
    while (itemBlock) {
      connections.push(itemBlock.valueConnection_);
      itemBlock =
        itemBlock.nextConnection && itemBlock.nextConnection.targetBlock();
    }
    // Disconnect any children that don't belong.
    for (var i = 0; i < this.itemCount_; i++) {
      var connection = this.getInput("ADD" + i).connection.targetConnection;
      if (connection && connections.indexOf(connection) == -1) {
        connection.disconnect();
      }
    }
    this.itemCount_ = connections.length;
    this.updateShape_();
    // Reconnect any child blocks.
    for (var i = 0; i < this.itemCount_; i++) {
      connections[i]?.reconnect(this, "ADD" + i);
    }
  },
  /**
   * Store pointers to any connected child blocks.
   * @param {!Blockly.Block} containerBlock Root block in mutator.
   * @this Blockly.Block
   */
  saveConnections: function (containerBlock) {
    var itemBlock = containerBlock.getInputTargetBlock("STACK");
    var i = 0;
    while (itemBlock) {
      var input = this.getInput("ADD" + i);
      itemBlock.valueConnection_ = input && input.connection.targetConnection;
      i++;
      itemBlock =
        itemBlock.nextConnection && itemBlock.nextConnection.targetBlock();
    }
  },
  /**
   * Modify this block to have the correct number of inputs.
   * @private
   * @this Blockly.Block
   */
  updateShape_: function () {
    if (this.itemCount_ && this.getInput("EMPTY")) {
      this.removeInput("EMPTY");
    } else if (!this.itemCount_ && !this.getInput("EMPTY")) {
      this.appendDummyInput("EMPTY").appendField("create empty list []");
    }
    // Add new inputs.
    for (var i = 0; i < this.itemCount_; i++) {
      if (!this.getInput("ADD" + i)) {
        var input = this.appendValueInput("ADD" + i);
        if (i == 0) {
          input.appendField("create list with [");
        } else {
          input.appendField(",").setAlign(Blockly.inputs.Align.RIGHT);
        }
      }
    }
    // Remove deleted inputs.
    while (this.getInput("ADD" + i)) {
      this.removeInput("ADD" + i);
      i++;
    }
    // Add the trailing "]"
    if (this.getInput("TAIL")) {
      this.removeInput("TAIL");
    }
    if (this.itemCount_) {
      this.appendDummyInput("TAIL")
        .appendField("]")
        .setAlign(Blockly.inputs.Align.RIGHT);
    }
  },
};

Blockly.Blocks["ast_List_create_with_container"] = {
  /**
   * Mutator block for list container.
   * @this Blockly.Block
   */
  init: function () {
    this.setColour(BlockMirrorTextToBlocks.COLOR.LIST);
    this.appendDummyInput().appendField("Add new list elements below");
    this.appendStatementInput("STACK");
    this.contextMenu = false;
  },
};

Blockly.Blocks["ast_List_create_with_item"] = {
  /**
   * Mutator block for adding items.
   * @this Blockly.Block
   */
  init: function () {
    this.setColour(BlockMirrorTextToBlocks.COLOR.LIST);
    this.appendDummyInput().appendField("Element");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.contextMenu = false;
  },
};

python.pythonGenerator.forBlock["ast_List"] = function (block, generator) {
  // Create a list with any number of elements of any type.
  var elements = new Array(block.itemCount_);
  for (var i = 0; i < block.itemCount_; i++) {
    elements[i] =
      python.pythonGenerator.valueToCode(
        block,
        "ADD" + i,
        python.pythonGenerator.ORDER_NONE,
      ) || python.pythonGenerator.blank;
  }
  var code = "[" + elements.join(", ") + "]";
  return [code, python.pythonGenerator.ORDER_ATOMIC];
};

BlockMirrorTextToBlocks.prototype["ast_List"] = function (node, parent) {
  var elts = node.elts;
  var ctx = node.ctx;

  return BlockMirrorTextToBlocks.create_block(
    "ast_List",
    node.lineno,
    {},
    this.convertElements("ADD", elts, node),
    {
      inline: elts.length > 3 ? "false" : "true",
    },
    {
      "@items": elts.length,
    },
  );
};
BlockMirrorTextToBlocks.BLOCKS.push({
    "type": "ast_Name",
    "message0": "%1",
    "args0": [
        {"type": "field_variable", "name": "VAR", "variable": "%{BKY_VARIABLES_DEFAULT_NAME}"}
    ],
    "output": null,
    "colour": BlockMirrorTextToBlocks.COLOR.VARIABLES,
    "extensions": ["contextMenu_variableSetterGetter_forBlockMirror"]
})

{
    /**
     * Mixin to add context menu items to create getter/setter blocks for this
     * setter/getter.
     * Used by blocks 'ast_Name' and 'ast_Assign'.
     * @mixin
     * @augments Blockly.Block
     * @package
     * @readonly
     */
    let mixin = {
        /**
         * Add menu option to create getter/setter block for this setter/getter.
         * @param {!Array} options List of menu options to add to.
         * @this Blockly.Block
         */
        customContextMenu: function(options) {
            let name;
            if (!this.isInFlyout){
                // Getter blocks have the option to create a setter block, and vice versa.
                let opposite_type, contextMenuMsg;
                if (this.type === 'ast_Name') {
                    opposite_type = 'ast_Assign';
                    contextMenuMsg = Blockly.Msg['VARIABLES_GET_CREATE_SET'];
                } else {
                    opposite_type = 'ast_Name';
                    contextMenuMsg = Blockly.Msg['VARIABLES_SET_CREATE_GET'];
                }

                var option = {enabled: this.workspace.remainingCapacity() > 0};
                name = this.getField('VAR').getText();
                option.text = contextMenuMsg.replace('%1', name);
                var xmlField = document.createElement('field');
                xmlField.setAttribute('name', 'VAR');
                xmlField.appendChild(document.createTextNode(name));
                var xmlBlock = document.createElement('block');
                xmlBlock.setAttribute('type', opposite_type);
                xmlBlock.appendChild(xmlField);
                option.callback = Blockly.ContextMenu.callbackFactory(this, xmlBlock);
                options.push(option);
                // Getter blocks have the option to rename or delete that variable.
            } else {
                if (this.type === 'ast_Name' || this.type === 'variables_get_reporter'){
                    var renameOption = {
                        text: Blockly.Msg.RENAME_VARIABLE,
                        enabled: true,
                        callback: Blockly.Constants.Variables.RENAME_OPTION_CALLBACK_FACTORY(this)
                    };
                    name = this.getField('VAR').getText();
                    var deleteOption = {
                        text: Blockly.Msg.DELETE_VARIABLE.replace('%1', name),
                        enabled: true,
                        callback: Blockly.Constants.Variables.DELETE_OPTION_CALLBACK_FACTORY(this)
                    };
                    options.unshift(renameOption);
                    options.unshift(deleteOption);
                }
            }
        }
    };

    Blockly.Extensions.registerMixin('contextMenu_variableSetterGetter_forBlockMirror',
        mixin);
}

python.pythonGenerator.forBlock['ast_Name'] = function(block, generator) {
    // Variable getter.
    var code = python.pythonGenerator.getVariableName(block.getFieldValue('VAR'),
        Blockly.Variables.NAME_TYPE);
    return [code, python.pythonGenerator.ORDER_ATOMIC];
};

BlockMirrorTextToBlocks.prototype['ast_Name'] = function (node, parent) {
    var id = node.id;
    var ctx = node.ctx;
    if (id.v == python.pythonGenerator.blank) {
        return null;
    } else {
        return BlockMirrorTextToBlocks.create_block('ast_Name', node.lineno, {
            "VAR": id.v
        });
    }
}
BlockMirrorTextToBlocks.BLOCKS.push({
    "type": "ast_NameConstantNone",
    "message0": "None",
    "args0": [],
    "output": "None",
    "colour": BlockMirrorTextToBlocks.COLOR.LOGIC
});

BlockMirrorTextToBlocks.BLOCKS.push({
    "type": "ast_NameConstantBoolean",
    "message0": "%1",
    "args0": [
        {
            "type": "field_dropdown", "name": "BOOL", "options": [
                ["True", "TRUE"],
                ["False", "FALSE"]
            ]
        }
    ],
    "output": "Boolean",
    "colour": BlockMirrorTextToBlocks.COLOR.LOGIC
});

python.pythonGenerator.forBlock['ast_NameConstantBoolean'] = function(block, generator) {
    // Boolean values true and false.
    var code = (block.getFieldValue('BOOL') == 'TRUE') ? 'True' : 'False';
    return [code, python.pythonGenerator.ORDER_ATOMIC];
};

python.pythonGenerator.forBlock['ast_NameConstantNone'] = function(block, generator) {
    // Boolean values true and false.
    var code = 'None';
    return [code, python.pythonGenerator.ORDER_ATOMIC];
};

BlockMirrorTextToBlocks.prototype['ast_NameConstant'] = function (node, parent) {
    let value = node.value;

    if (value === Sk.builtin.none.none$) {
        return BlockMirrorTextToBlocks.create_block('ast_NameConstantNone', node.lineno, {});
    } else if (value === Sk.builtin.bool.true$) {
        return BlockMirrorTextToBlocks.create_block('ast_NameConstantBoolean', node.lineno, {
            "BOOL": 'TRUE'
        });
    } else if (value === Sk.builtin.bool.false$) {
        return BlockMirrorTextToBlocks.create_block('ast_NameConstantBoolean', node.lineno, {
            "BOOL": 'FALSE'
        });
    }
};Blockly.Blocks['ast_Nonlocal'] = {
    init: function () {
        this.setInputsInline(true);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(BlockMirrorTextToBlocks.COLOR.VARIABLES);
        this.nameCount_ = 1;
        this.appendDummyInput('NONLOCAL')
            .appendField("make nonlocal", "START_NONLOCALS");
        this.updateShape_();
    },
    updateShape_: function () {
        let input = this.getInput("NONLOCAL");
        // Update pluralization
        if (this.getField('START_NONLOCALS')) {
            this.setFieldValue(this.nameCount_ > 1 ? "make nonlocals" : "make nonlocal", "START_NONLOCALS");
        }
        // Update fields
        for (var i = 0; i < this.nameCount_; i++) {
            if (!this.getField('NAME' + i)) {
                if (i !== 0) {
                    input.appendField(',').setAlign(Blockly.inputs.Align.RIGHT);
                }
                input.appendField(new Blockly.FieldVariable("variable"), 'NAME' + i);
            }
        }
        // Remove deleted fields.
        while (this.getField('NAME' + i)) {
            input.removeField('NAME' + i);
            i++;
        }
        // Delete and re-add ending field
        if (this.getField("END_NONLOCALS")) {
            input.removeField("END_NONLOCALS");
        }
        input.appendField("available", "END_NONLOCALS");
    },
    /**
     * Create XML to represent list inputs.
     * @return {!Element} XML storage element.
     * @this Blockly.Block
     */
    mutationToDom: function () {
        var container = document.createElement('mutation');
        container.setAttribute('names', this.nameCount_);
        return container;
    },
    /**
     * Parse XML to restore the list inputs.
     * @param {!Element} xmlElement XML storage element.
     * @this Blockly.Block
     */
    domToMutation: function (xmlElement) {
        this.nameCount_ = parseInt(xmlElement.getAttribute('names'), 10);
        this.updateShape_();
    },
};

python.pythonGenerator.forBlock['ast_Nonlocal'] = function(block, generator) {
    // Create a list with any number of elements of any type.
    let elements = new Array(block.nameCount_);
    for (let i = 0; i < block.nameCount_; i++) {
        elements[i] = python.pythonGenerator.getVariableName(block.getFieldValue('NAME' + i), Blockly.Variables.NAME_TYPE);
    }
    return 'nonlocal ' + elements.join(', ') + "\n";
};

BlockMirrorTextToBlocks.prototype['ast_Nonlocal'] = function (node, parent) {
    let names = node.names;

    let fields = {};
    for (var i = 0; i < names.length; i++) {
        fields["NAME" + i] = Sk.ffi.remapToJs(names[i]);
    }

    return BlockMirrorTextToBlocks.create_block("ast_Nonlocal", node.lineno,
        fields,
        {}, {
            "inline": "true",
        }, {
            "@names": names.length
        });
};BlockMirrorTextToBlocks.BLOCKS.push({
    "type": "ast_Num",
    "message0": "%1",
    "args0": [
        { "type": "field_number", "name": "NUM", "value": 0}
    ],
    "output": "Number",
    "colour": BlockMirrorTextToBlocks.COLOR.MATH
})

python.pythonGenerator.forBlock['ast_Num'] = function(block) {
  // Numeric value.
  var code = parseFloat(block.getFieldValue('NUM'));
  var order;
  if (code == Infinity) {
    code = 'float("inf")';
    order = python.pythonGenerator.ORDER_FUNCTION_CALL;
  } else if (code == -Infinity) {
    code = '-float("inf")';
    order = python.pythonGenerator.ORDER_UNARY_SIGN;
  } else {
    order = code < 0 ? python.pythonGenerator.ORDER_UNARY_SIGN :
            python.pythonGenerator.ORDER_ATOMIC;
  }
  return [code, order];
};

BlockMirrorTextToBlocks.prototype['ast_Num'] = function (node, parent) {
    var n = node.n;
    return BlockMirrorTextToBlocks.create_block("ast_Num", node.lineno, {
        "NUM": Sk.ffi.remapToJs(n)
    });
}
Blockly.Blocks['ast_Raise'] = {
    init: function () {
        this.setInputsInline(true);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(BlockMirrorTextToBlocks.COLOR.EXCEPTIONS);
        this.exc_ = true;
        this.cause_ = false;

        this.appendDummyInput()
            .appendField("raise");
        this.updateShape_();
    },
    updateShape_: function () {
        if (this.exc_ && !this.getInput('EXC')) {
            this.appendValueInput("EXC")
                .setCheck(null);
        } else if (!this.exc_ && this.getInput('EXC')) {
            this.removeInput('EXC');
        }
        if (this.cause_ && !this.getInput('CAUSE')) {
            this.appendValueInput("CAUSE")
                .setCheck(null)
                .appendField("from");
        } else if (!this.cause_ && this.getInput('CAUSE')) {
            this.removeInput('CAUSE');
        }
        if (this.cause_ && this.exc_) {
            this.moveInputBefore('EXC', 'CAUSE');
        }
    },
    /**
     * Create XML to represent list inputs.
     * @return {!Element} XML storage element.
     * @this Blockly.Block
     */
    mutationToDom: function () {
        var container = document.createElement('mutation');
        container.setAttribute('exc', this.exc_);
        container.setAttribute('cause', this.cause_);
        return container;
    },
    /**
     * Parse XML to restore the list inputs.
     * @param {!Element} xmlElement XML storage element.
     * @this Blockly.Block
     */
    domToMutation: function (xmlElement) {
        this.exc_ = "true" === xmlElement.getAttribute('exc');
        this.cause_ = "true" === xmlElement.getAttribute('cause');
        this.updateShape_();
    },
};

python.pythonGenerator.forBlock['ast_Raise'] = function(block, generator) {
    if (this.exc_) {
        let exc = python.pythonGenerator.valueToCode(block, 'EXC', python.pythonGenerator.ORDER_NONE) || python.pythonGenerator.blank;
        if (this.cause_) {
            let cause = python.pythonGenerator.valueToCode(block, 'CAUSE', python.pythonGenerator.ORDER_NONE)
                || python.pythonGenerator.blank;
            return "raise " + exc + " from " + cause + "\n";
        } else {
            return "raise " + exc + "\n";
        }
    } else {
        return "raise"+"\n";
    }
};

BlockMirrorTextToBlocks.prototype['ast_Raise'] = function (node, parent) {
    var exc = node.exc;
    var cause = node.cause;
    let values = {};
    let hasExc = false, hasCause = false;
    if (exc !== null) {
        values['EXC'] = this.convert(exc, node);
        hasExc = true;
    }
    if (cause !== null) {
        values['CAUSE'] = this.convert(cause, node);
        hasCause = true;
    }
    return BlockMirrorTextToBlocks.create_block("ast_Raise", node.lineno, {}, values, {}, {
        '@exc': hasExc,
        '@cause': hasCause
    });
};{
    let multiline_input_type = "field_multilinetext";

    if (!Blockly.registry.hasItem(Blockly.registry.Type.FIELD, multiline_input_type)) {
        if (typeof registerFieldMultilineInput === "function") {
            // Register if the field-multilineinput plugin is available
            registerFieldMultilineInput()
        } else {
            // Fallback in case plugin @blockly/field-multilineinput is not available
            multiline_input_type = "field_input";
        }
    }

    BlockMirrorTextToBlocks.BLOCKS.push({
        "type": "ast_Raw",
        "message0": "Code Block: %1 %2",
        "args0": [
            {"type": "input_dummy"},
            {"type": multiline_input_type, "name": "TEXT", "value": ''}
        ],
        "colour": BlockMirrorTextToBlocks.COLOR.PYTHON,
        "previousStatement": null,
        "nextStatement": null,
    });
}

python.pythonGenerator.forBlock['ast_Raw'] = function(block, generator) {
    var code = block.getFieldValue('TEXT') + "\n";
    return code;
};
Blockly.Blocks['ast_ReturnFull'] = {
  init: function() {
    this.appendValueInput('VALUE')
      .appendField('return');
    this.setInputsInline(true)
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(BlockMirrorTextToBlocks.COLOR.FUNCTIONS);
  }
};
// Blockly.common.defineBlocks({ast_ReturnFull: ast_ReturnFull});

// BlockMirrorTextToBlocks.BLOCKS.push({
//     "message0": "return %1",
//     "args0": [
//         {"type": "input_value", "name": "VALUE"}
//     ],
//     "inputsInline": true,
//     "previousStatement": null,
//     "nextStatement": null,
//     "colour": BlockMirrorTextToBlocks.COLOR.FUNCTIONS
// });

BlockMirrorTextToBlocks.BLOCKS.push({
    "type": "ast_Return",
    "message0": "return",
    "inputsInline": true,
    "previousStatement": null,
    "nextStatement": null,
    "colour": BlockMirrorTextToBlocks.COLOR.FUNCTIONS
});

python.pythonGenerator.forBlock['ast_Return'] = function(block, generator) {
    return "return\n";
};

python.pythonGenerator.forBlock['ast_ReturnFull'] = function(block, generator) {
    var value = python.pythonGenerator.valueToCode(block, 'VALUE', python.pythonGenerator.ORDER_ATOMIC) || python.pythonGenerator.blank;
    return "return " + value + "\n";
};

BlockMirrorTextToBlocks.prototype['ast_Return'] = function (node, parent) {
    let value = node.value;

    if (value == null) {
        return BlockMirrorTextToBlocks.create_block("ast_Return", node.lineno);
    } else {
        return BlockMirrorTextToBlocks.create_block("ast_ReturnFull", node.lineno, {}, {
            "VALUE": this.convert(value, node)
        });
    }
};Blockly.Blocks["ast_Set"] = {
  /**
   * Block for creating a set with any number of elements of any type.
   * @this Blockly.Block
   */
  init: function () {
    this.setColour(BlockMirrorTextToBlocks.COLOR.SET);
    this.itemCount_ = 3;
    this.updateShape_();
    this.setOutput(true, "Set");
    this.setMutator(new Blockly.icons.MutatorIcon(["ast_Set_create_with_item"], this));
  },
  /**
   * Create XML to represent set inputs.
   * @return {!Element} XML storage element.
   * @this Blockly.Block
   */
  mutationToDom: function () {
    var container = document.createElement("mutation");
    container.setAttribute("items", this.itemCount_);
    return container;
  },
  /**
   * Parse XML to restore the set inputs.
   * @param {!Element} xmlElement XML storage element.
   * @this Blockly.Block
   */
  domToMutation: function (xmlElement) {
    this.itemCount_ = parseInt(xmlElement.getAttribute("items"), 10);
    this.updateShape_();
  },
  /**
   * Populate the mutator's dialog with this block's components.
   * @param {!Blockly.Workspace} workspace Mutator's workspace.
   * @return {!Blockly.Block} Root block in mutator.
   * @this Blockly.Block
   */
  decompose: function (workspace) {
    var containerBlock = workspace.newBlock("ast_Set_create_with_container");
    containerBlock.initSvg();
    var connection = containerBlock.getInput("STACK").connection;
    for (var i = 0; i < this.itemCount_; i++) {
      var itemBlock = workspace.newBlock("ast_Set_create_with_item");
      itemBlock.initSvg();
      connection.connect(itemBlock.previousConnection);
      connection = itemBlock.nextConnection;
    }
    return containerBlock;
  },
  /**
   * Reconfigure this block based on the mutator dialog's components.
   * @param {!Blockly.Block} containerBlock Root block in mutator.
   * @this Blockly.Block
   */
  compose: function (containerBlock) {
    var itemBlock = containerBlock.getInputTargetBlock("STACK");
    // Count number of inputs.
    var connections = [];
    while (itemBlock) {
      connections.push(itemBlock.valueConnection_);
      itemBlock =
        itemBlock.nextConnection && itemBlock.nextConnection.targetBlock();
    }
    // Disconnect any children that don't belong.
    for (var i = 0; i < this.itemCount_; i++) {
      var connection = this.getInput("ADD" + i).connection.targetConnection;
      if (connection && connections.indexOf(connection) == -1) {
        connection.disconnect();
      }
    }
    this.itemCount_ = connections.length;
    this.updateShape_();
    // Reconnect any child blocks.
    for (var i = 0; i < this.itemCount_; i++) {
      connections[i]?.reconnect(this, "ADD" + i);
    }
  },
  /**
   * Store pointers to any connected child blocks.
   * @param {!Blockly.Block} containerBlock Root block in mutator.
   * @this Blockly.Block
   */
  saveConnections: function (containerBlock) {
    var itemBlock = containerBlock.getInputTargetBlock("STACK");
    var i = 0;
    while (itemBlock) {
      var input = this.getInput("ADD" + i);
      itemBlock.valueConnection_ = input && input.connection.targetConnection;
      i++;
      itemBlock =
        itemBlock.nextConnection && itemBlock.nextConnection.targetBlock();
    }
  },
  /**
   * Modify this block to have the correct number of inputs.
   * @private
   * @this Blockly.Block
   */
  updateShape_: function () {
    if (this.itemCount_ && this.getInput("EMPTY")) {
      this.removeInput("EMPTY");
    } else if (!this.itemCount_ && !this.getInput("EMPTY")) {
      this.appendDummyInput("EMPTY").appendField("create empty set");
    }
    // Add new inputs.
    for (var i = 0; i < this.itemCount_; i++) {
      if (!this.getInput("ADD" + i)) {
        var input = this.appendValueInput("ADD" + i);
        if (i === 0) {
          input
            .appendField("create set with {")
            .setAlign(Blockly.inputs.Align.RIGHT);
        } else {
          input.appendField(",").setAlign(Blockly.inputs.Align.RIGHT);
        }
      }
    }
    // Remove deleted inputs.
    while (this.getInput("ADD" + i)) {
      this.removeInput("ADD" + i);
      i++;
    }
    // Add the trailing "]"
    if (this.getInput("TAIL")) {
      this.removeInput("TAIL");
    }
    if (this.itemCount_) {
      this.appendDummyInput("TAIL")
        .appendField("}")
        .setAlign(Blockly.inputs.Align.RIGHT);
    }
  },
};

Blockly.Blocks["ast_Set_create_with_container"] = {
  /**
   * Mutator block for set container.
   * @this Blockly.Block
   */
  init: function () {
    this.setColour(BlockMirrorTextToBlocks.COLOR.SET);
    this.appendDummyInput().appendField("Add new set elements below");
    this.appendStatementInput("STACK");
    this.contextMenu = false;
  },
};

Blockly.Blocks["ast_Set_create_with_item"] = {
  /**
   * Mutator block for adding items.
   * @this Blockly.Block
   */
  init: function () {
    this.setColour(BlockMirrorTextToBlocks.COLOR.SET);
    this.appendDummyInput().appendField("Element");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.contextMenu = false;
  },
};

python.pythonGenerator.forBlock["ast_Set"] = function (block, generator) {
  // Create a set with any number of elements of any type.
  if (block.itemCount_ === 0) {
    return ["set()", python.pythonGenerator.ORDER_FUNCTION_CALL];
  }
  var elements = new Array(block.itemCount_);
  for (var i = 0; i < block.itemCount_; i++) {
    elements[i] =
      python.pythonGenerator.valueToCode(
        block,
        "ADD" + i,
        python.pythonGenerator.ORDER_NONE,
      ) || python.pythonGenerator.blank;
  }
  var code = "{" + elements.join(", ") + "}";
  return [code, python.pythonGenerator.ORDER_ATOMIC];
};

BlockMirrorTextToBlocks.prototype["ast_Set"] = function (node, parent) {
  var elts = node.elts;

  return BlockMirrorTextToBlocks.create_block(
    "ast_Set",
    node.lineno,
    {},
    this.convertElements("ADD", elts, node),
    {
      inline: elts.length > 3 ? "false" : "true",
    },
    {
      "@items": elts.length,
    },
  );
};
BlockMirrorTextToBlocks.BLOCKS.push({
    "type": 'ast_Starred',
    "message0": "*%1",
    "args0": [
        {"type": "input_value", "name": "VALUE"}
    ],
    "inputsInline": false,
    "output": null,
    "colour": BlockMirrorTextToBlocks.COLOR.VARIABLES
});

python.pythonGenerator.forBlock['ast_Starred'] = function(block, generator) {
    // Basic arithmetic operators, and power.
    var order = python.pythonGenerator.ORDER_NONE;
    var argument1 = python.pythonGenerator.valueToCode(block, 'VALUE', order) || python.pythonGenerator.blank;
    var code = "*" + argument1;
    return [code, order];
};

BlockMirrorTextToBlocks.prototype['ast_Starred'] = function (node, parent) {
    let value = node.value;
    let ctx = node.ctx;

    return BlockMirrorTextToBlocks.create_block('ast_Starred', node.lineno, {}, {
        "VALUE": this.convert(value, node)
    }, {
        "inline": true
    });
}BlockMirrorTextToBlocks.BLOCKS.push({
    "type": "ast_Str",
    "message0": "%1",
    "args0": [
        {"type": "field_input", "name": "TEXT", "value": ''}
    ],
    "output": "String",
    "colour": BlockMirrorTextToBlocks.COLOR.TEXT,
    "extensions": ["text_quotes"]
});

BlockMirrorTextToBlocks.BLOCKS.push({
    "type": "ast_StrChar",
    "message0": "%1",
    "args0": [
        {"type": "field_dropdown", "name": "TEXT", "options": [
            ["\\n", "\n"], ["\\t", "\t"]
            ]}
    ],
    "output": "String",
    "colour": BlockMirrorTextToBlocks.COLOR.TEXT,
    "extensions": ["text_quotes"]
});


{
    let multiline_input_type = "field_multilinetext";

    if (!Blockly.registry.hasItem(Blockly.registry.Type.FIELD, multiline_input_type)) {
        if (typeof registerFieldMultilineInput === "function") {
            // Register if the field-multilineinput plugin is available
            registerFieldMultilineInput()
        } else {
            // Fallback in case plugin @blockly/field-multilineinput is not available
            multiline_input_type = "field_input";
        }
    }

    BlockMirrorTextToBlocks.BLOCKS.push({
        "type": "ast_StrMultiline",
        "message0": "%1",
        "args0": [
            {"type": multiline_input_type, "name": "TEXT", "value": ''}
        ],
        "output": "String",
        "colour": BlockMirrorTextToBlocks.COLOR.TEXT,
        "extensions": ["text_quotes"]
    });

    BlockMirrorTextToBlocks.BLOCKS.push({
        "type": "ast_StrDocstring",
        "message0": "Docstring: %1 %2",
        "args0": [
            {"type": "input_dummy"},
            {"type": multiline_input_type, "name": "TEXT", "value": ''}
        ],
        "previousStatement": null,
        "nextStatement": null,
        "colour": BlockMirrorTextToBlocks.COLOR.TEXT
    });
}

Blockly.Blocks['ast_Image'] = {
    init: function () {
        this.setColour(BlockMirrorTextToBlocks.COLOR.TEXT);
        this.src_ = "loading.png";
        this.updateShape_();
        this.setOutput(true);
    },
    mutationToDom: function () {
        var container = document.createElement('mutation');
        container.setAttribute('src', this.src_);
        return container;
    },
    domToMutation: function (xmlElement) {
        this.src_ = xmlElement.getAttribute('src');
        this.updateShape_();
    },
    updateShape_: function () {
        let image = this.getInput('IMAGE');
        if (!image) {
            image = this.appendDummyInput("IMAGE");
            image.appendField(new Blockly.FieldImage(this.src_, 40, 40, { alt: this.src_, flipRtl: "FALSE" }));
        }
        let imageField = image.fieldRow[0];
        imageField.setValue(this.src_);
    }
};

/*
"https://game-icons.net/icons/ffffff/000000/1x1/delapouite/labrador-head.png"
BlockMirrorTextToBlocks.BLOCKS.push({
    "type": "ast_StrImage",
    "message0": "%1%2",
    "args0": [
        {"type": "field_image", "src": "https://game-icons.net/icons/ffffff/000000/1x1/delapouite/labrador-head.png", "width": 20, "height": 20, "alt": ""},
        //{"type": "field_label_serializable", "name": "SRC", "value": '', "visible": "false"}
    ],
    "output": "String",
    "colour": BlockMirrorTextToBlocks.COLOR.TEXT,
    //"extensions": ["text_quotes"]
});*/

python.pythonGenerator.forBlock['ast_Str'] = function(block, generator) {
    // Text value
    let code = python.pythonGenerator.quote_(block.getFieldValue('TEXT'));
    code = code.replace("\n", "n");
    return [code, python.pythonGenerator.ORDER_ATOMIC];
};

python.pythonGenerator.forBlock['ast_StrChar'] = function(block, generator) {
    // Text value
    let value = block.getFieldValue('TEXT');
    switch (value) {
        case "\n": return ["'\\n'", python.pythonGenerator.ORDER_ATOMIC];
        case "\t": return ["'\\t'", python.pythonGenerator.ORDER_ATOMIC];
    }
};

python.pythonGenerator.forBlock['ast_Image'] = function(block, generator) {
    // Text value
    //python.pythonGenerator.definitions_["import_image"] = "from image import Image";
    let code = python.pythonGenerator.quote_(block.src_);
    return [code, python.pythonGenerator.ORDER_FUNCTION_CALL];
};

const multiline_quote = function (string) {
    // Can't use goog.string.quote since % must also be escaped.
  string = string.replace(/'''/g, '\\\'\\\'\\\'');
  return '\'\'\'' + string + '\'\'\'';
}

python.pythonGenerator.forBlock['ast_StrMultiline'] = function(block, generator) {
    // Text value
    let code = multiline_quote(block.getFieldValue('TEXT'));
    return [code, python.pythonGenerator.ORDER_ATOMIC];
};

python.pythonGenerator.forBlock['ast_StrDocstring'] = function(block, generator) {
    // Text value.
    let code = block.getFieldValue('TEXT');
    if (code.charAt(0) !== '\n') {
        code = '\n' + code;
    }
    if (code.charAt(code.length-1) !== '\n') {
        code = code + '\n';
    }
    return multiline_quote(code)+"\n";
};

BlockMirrorTextToBlocks.prototype.isSingleChar = function (text) {
    return text === "\n" || text === "\t";
};

BlockMirrorTextToBlocks.prototype.isDocString = function (node, parent) {
    return (parent._astname === 'Expr' &&
        parent._parent &&
        ['FunctionDef', 'ClassDef'].indexOf(parent._parent._astname) !== -1 &&
        parent._parent.body[0] === parent);
};

BlockMirrorTextToBlocks.prototype.isSimpleString = function (text) {
    return text.split("\n").length <= 2 && text.length <= 40;
};

BlockMirrorTextToBlocks.prototype.dedent = function (text, levels, isDocString) {
    // console.log(text, levels, isDocString);
    if (!isDocString && text.charAt(0) === "\n") {
        return text;
    }
    let split = text.split("\n");
    let indentation = "    ".repeat(levels);
    let recombined = [];
    // Are all lines indented?
    for (let i = 0; i < split.length; i++) {
        // This was a blank line, add it unchanged unless its the first line
        if (split[i] === '') {
            if (i !== 0) {
                recombined.push("");
            }
        // If it has our ideal indentation, add it without indentation
        } else if (split[i].startsWith(indentation)) {
            let unindentedLine = split[i].substr(indentation.length);
            if (unindentedLine !== '' || i !== split.length - 1) {
                recombined.push(unindentedLine);
            }
        // If it's the first line, then add it unmodified
        } else if (i === 0) {
            recombined.push(split[i]);
        // This whole structure cannot be uniformly dedented, better give up.
        } else {
            return text;
        }
    }
    return recombined.join("\n");
};

// TODO: Handle indentation intelligently
BlockMirrorTextToBlocks.prototype['ast_Str'] = function (node, parent) {
    let s = node.s;
    let text = Sk.ffi.remapToJs(s);
    const regex = BlockMirrorTextEditor.REGEX_PATTERNS[this.blockMirror.configuration.imageDetection];
    //console.log(text, regex.test(JSON.stringify(text)));
    if (regex.test(JSON.stringify(text))) {
        //if (text.startsWith("http") && text.endsWith(".png")) {
        return BlockMirrorTextToBlocks.create_block("ast_Image", node.lineno, {}, {}, {},
            {"@src": text});
    } else if (this.isSingleChar(text)) {
        return BlockMirrorTextToBlocks.create_block("ast_StrChar", node.lineno, {"TEXT": text});
    } else if (this.isDocString(node, parent)) {
        let dedented = this.dedent(text, this.levelIndex - 1, true);
        return [BlockMirrorTextToBlocks.create_block("ast_StrDocstring", node.lineno, {"TEXT": dedented})];
    } else if (text.indexOf('\n') === -1) {
        return BlockMirrorTextToBlocks.create_block("ast_Str", node.lineno, {"TEXT": text});
    } else {
        let dedented = this.dedent(text, this.levelIndex - 1, false);
        // console.log("DD", dedented);
        return BlockMirrorTextToBlocks.create_block("ast_StrMultiline", node.lineno, {"TEXT": dedented});
    }
};
Blockly.Blocks['ast_Subscript'] = {
    init: function () {
        this.setInputsInline(true);
        this.setOutput(true);
        this.setColour(BlockMirrorTextToBlocks.COLOR.SEQUENCES);
        this.sliceKinds_ = ["I"];

        this.appendValueInput("VALUE")
            .setCheck(null);
        this.appendDummyInput('OPEN_BRACKET')
            .appendField("[",);
        this.appendDummyInput('CLOSE_BRACKET')
            .appendField("]",);
        this.updateShape_();
    },
    setExistence: function (label, exist, isDummy) {
        if (exist && !this.getInput(label)) {
            if (isDummy) {
                return this.appendDummyInput(label);
            } else {
                return this.appendValueInput(label);
            }
        } else if (!exist && this.getInput(label)) {
            this.removeInput(label);
        }
        return null;
    },
    createSlice_: function (i, kind) {
        // ,
        let input = this.setExistence('COMMA' + i, i !== 0, true);
        if (input) {
            input.appendField(",")
        }
        // Single index
        let isIndex = (kind.charAt(0) === 'I');
        input = this.setExistence('INDEX' + i, isIndex, false);
        // First index
        input = this.setExistence('SLICELOWER' + i, !isIndex && "1" === kind.charAt(1), false);
        // First colon
        input = this.setExistence('SLICECOLON' + i, !isIndex , true);
        if (input) {
            input.appendField(':').setAlign(Blockly.inputs.Align.RIGHT);
        }
        // Second index
        input = this.setExistence('SLICEUPPER' + i, !isIndex && "1" === kind.charAt(2), false);
        // Second colon and third index
        input = this.setExistence('SLICESTEP' + i, !isIndex && "1" === kind.charAt(3), false);
        if (input) {
            input.appendField(':').setAlign(Blockly.inputs.Align.RIGHT);
        }
    },
    updateShape_: function () {
        // Add new inputs.
        for (var i = 0; i < this.sliceKinds_.length; i++) {
            this.createSlice_(i, this.sliceKinds_[i]);
        }

        for (let j = 0; j < i; j++) {
            if (j !== 0) {
                this.moveInputBefore('COMMA' + j, 'CLOSE_BRACKET');
            }
            let kind = this.sliceKinds_[j];
            if (kind.charAt(0) === "I") {
                this.moveInputBefore('INDEX' + j, 'CLOSE_BRACKET');
            } else {
                if (kind.charAt(1) === "1") {
                    this.moveInputBefore("SLICELOWER" + j, 'CLOSE_BRACKET');
                }
                this.moveInputBefore("SLICECOLON" + j, 'CLOSE_BRACKET');
                if (kind.charAt(2) === "1") {
                    this.moveInputBefore("SLICEUPPER" + j, 'CLOSE_BRACKET');
                }
                if (kind.charAt(3) === "1") {
                    this.moveInputBefore("SLICESTEP" + j, 'CLOSE_BRACKET');
                }
            }
        }

        // Remove deleted inputs.
        while (this.getInput('TARGET' + i) || this.getInput('SLICECOLON')) {
            this.removeInput('COMMA'+i, true);
            if (this.getInput('INDEX' + i)) {
                this.removeInput('INDEX' + i);
            } else {
                this.removeInput('SLICELOWER' + i, true);
                this.removeInput('SLICECOLON' + i, true);
                this.removeInput('SLICEUPPER' + i, true);
                this.removeInput('SLICESTEP' + i, true);
            }
            i++;
        }
    },
    /**
     * Create XML to represent list inputs.
     * @return {!Element} XML storage element.
     * @this Blockly.Block
     */
    mutationToDom: function () {
        let container = document.createElement('mutation');
        for (let i = 0; i < this.sliceKinds_.length; i++) {
            let parameter = document.createElement('arg');
            parameter.setAttribute('name', this.sliceKinds_[i]);
            container.appendChild(parameter);
        }
        return container;
    },
    /**
     * Parse XML to restore the list inputs.
     * @param {!Element} xmlElement XML storage element.
     * @this Blockly.Block
     */
    domToMutation: function (xmlElement) {
        this.sliceKinds_ = [];
        for (let i = 0, childNode; childNode = xmlElement.childNodes[i]; i++) {
            if (childNode.nodeName.toLowerCase() === 'arg') {
                this.sliceKinds_.push(childNode.getAttribute('name'));
            }
        }
        this.updateShape_();
    },
};

python.pythonGenerator.forBlock['ast_Subscript'] = function(block, generator) {
    // Create a list with any number of elements of any type.
    let value = python.pythonGenerator.valueToCode(block, 'VALUE',
        python.pythonGenerator.ORDER_MEMBER) || python.pythonGenerator.blank;
    var slices = new Array(block.sliceKinds_.length);
    for (let i = 0; i < block.sliceKinds_.length; i++) {
        let kind = block.sliceKinds_[i];
        if (kind.charAt(0) === 'I') {
            slices[i] = python.pythonGenerator.valueToCode(block, 'INDEX' + i,
                python.pythonGenerator.ORDER_MEMBER) || python.pythonGenerator.blank;
        } else {
            slices[i] = "";
            if (kind.charAt(1) === '1') {
                slices[i] += python.pythonGenerator.valueToCode(block, 'SLICELOWER' + i,
                    python.pythonGenerator.ORDER_MEMBER) || python.pythonGenerator.blank;
            }
            slices[i] += ":";
            if (kind.charAt(2) === '1') {
                slices[i] += python.pythonGenerator.valueToCode(block, 'SLICEUPPER' + i,
                    python.pythonGenerator.ORDER_MEMBER) || python.pythonGenerator.blank;
            }
            if (kind.charAt(3) === '1') {
                slices[i] += ":" + python.pythonGenerator.valueToCode(block, 'SLICESTEP' + i,
                    python.pythonGenerator.ORDER_MEMBER) || python.pythonGenerator.blank;
            }
        }
    }
    var code = value + '[' + slices.join(', ') + "]";
    return [code, python.pythonGenerator.ORDER_MEMBER];
};

var isWeirdSliceCase = function(slice) {
    return (slice.lower == null && slice.upper == null &&
        slice.step !== null && slice.step._astname === 'NameConstant' &&
        slice.step.value === Sk.builtin.none.none$);
}

BlockMirrorTextToBlocks.prototype.addSliceDim = function (slice, i, values, mutations, node) {
    let sliceKind = slice._astname;
    if (sliceKind === "Index") {
        values['INDEX' + i] = this.convert(slice.value, node);
        mutations.push("I");
    } else if (sliceKind === "Slice") {
        let L = "0", U = "0", S = "0";
        if (slice.lower !== null) {
            values['SLICELOWER' + i] = this.convert(slice.lower, node);
            L = "1";
        }
        if (slice.upper !== null) {
            values['SLICEUPPER' + i] = this.convert(slice.upper, node);
            U = "1";
        }
        if (slice.step !== null && !isWeirdSliceCase(slice)) {
            values['SLICESTEP' + i] = this.convert(slice.step, node);
            S = "1";
        }
        mutations.push("S" + L + U + S);
    }
}

BlockMirrorTextToBlocks.prototype['ast_Subscript'] = function (node, parent) {
    let value = node.value;
    let slice = node.slice;
    let ctx = node.ctx;

    let values = {'VALUE': this.convert(value, node)};
    let mutations = [];

    let sliceKind = slice._astname;
    if (sliceKind === "ExtSlice") {
        for (let i = 0; i < slice.dims.length; i += 1) {
            let dim = slice.dims[i];
            this.addSliceDim(dim, i, values, mutations, node);
        }
    } else {
        this.addSliceDim(slice, 0, values, mutations, node);
    }
    return BlockMirrorTextToBlocks.create_block("ast_Subscript", node.lineno, {},
        values, {"inline": "true"}, {"arg": mutations});
};BlockMirrorTextToBlocks.HANDLERS_CATCH_ALL = 0;
BlockMirrorTextToBlocks.HANDLERS_NO_AS = 1;
BlockMirrorTextToBlocks.HANDLERS_COMPLETE = 3;

Blockly.Blocks['ast_Try'] = {
    init: function () {
        this.handlersCount_ = 0;
        this.handlers_ = [];
        this.hasElse_ = false;
        this.hasFinally_ = false;
        this.appendDummyInput()
            .appendField("try:");
        this.appendStatementInput("BODY")
            .setCheck(null)
            .setAlign(Blockly.inputs.Align.RIGHT);
        this.setInputsInline(true);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(BlockMirrorTextToBlocks.COLOR.EXCEPTIONS);
        this.updateShape_();
    },
    // TODO: Not mutable currently
    updateShape_: function () {
        for (let i = 0; i < this.handlersCount_; i++) {
            if (this.handlers_[i] === BlockMirrorTextToBlocks.HANDLERS_CATCH_ALL) {
                this.appendDummyInput()
                    .appendField('except');
            } else {
                this.appendValueInput("TYPE"+i)
                    .setCheck(null)
                    .appendField("except");
                if (this.handlers_[i] === BlockMirrorTextToBlocks.HANDLERS_COMPLETE) {
                    this.appendDummyInput()
                        .appendField("as")
                        .appendField(new Blockly.FieldVariable("item"), "NAME"+i);
                }
            }
            this.appendStatementInput("HANDLER"+i)
                .setCheck(null);
        }
        if (this.hasElse_) {
            this.appendDummyInput()
                .appendField("else:");
            this.appendStatementInput("ORELSE")
                .setCheck(null);
        }
        if (this.hasFinally_) {
            this.appendDummyInput()
                .appendField("finally:");
            this.appendStatementInput("FINALBODY")
                .setCheck(null);
        }
    },
    /**
     * Create XML to represent the (non-editable) name and arguments.
     * @return {!Element} XML storage element.
     * @this Blockly.Block
     */
    mutationToDom: function () {
        let container = document.createElement('mutation');
        container.setAttribute('orelse', this.hasElse_);
        container.setAttribute('finalbody', this.hasFinally_);
        container.setAttribute('handlers', this.handlersCount_);
        for (let i = 0; i < this.handlersCount_; i++) {
            let parameter = document.createElement('arg');
            parameter.setAttribute('name', this.handlers_[i]);
            container.appendChild(parameter);
        }
        return container;
    },
    /**
     * Parse XML to restore the (non-editable) name and parameters.
     * @param {!Element} xmlElement XML storage element.
     * @this Blockly.Block
     */
    domToMutation: function (xmlElement) {
        this.hasElse_ = "true" === xmlElement.getAttribute('orelse');
        this.hasFinally_ = "true" === xmlElement.getAttribute('finalbody');
        this.handlersCount_ = parseInt(xmlElement.getAttribute('handlers'), 10);
        this.handlers_ = [];
        for (let i = 0, childNode; childNode = xmlElement.childNodes[i]; i++) {
            if (childNode.nodeName.toLowerCase() === 'arg') {
                this.handlers_.push(parseInt(childNode.getAttribute('name'), 10));
            }
        }
        this.updateShape_();
    },
};

python.pythonGenerator.forBlock['ast_Try'] = function(block, generator) {
    // Try:
    let body = python.pythonGenerator.statementToCode(block, 'BODY') || python.pythonGenerator.PASS;
    // Except clauses
    var handlers = new Array(block.handlersCount_);
    for (let i = 0; i < block.handlersCount_; i++) {
        let level = block.handlers_[i];
        let clause = "except";
        if (level !== BlockMirrorTextToBlocks.HANDLERS_CATCH_ALL) {
            clause += " " + python.pythonGenerator.valueToCode(block, 'TYPE' + i,
                python.pythonGenerator.ORDER_NONE) || python.pythonGenerator.blank;
            if (level === BlockMirrorTextToBlocks.HANDLERS_COMPLETE) {
                clause += " as " + python.pythonGenerator.getVariableName(block.getFieldValue('NAME' + i),
                    Blockly.Variables.NAME_TYPE);
            }
        }
        clause += ":\n" + (python.pythonGenerator.statementToCode(block, 'HANDLER' + i) || python.pythonGenerator.PASS);
        handlers[i] = clause;
    }
    // Orelse:
    let orelse = "";
    if (this.hasElse_) {
        orelse = "else:\n" + (python.pythonGenerator.statementToCode(block, 'ORELSE') || python.pythonGenerator.PASS);
    }
    // Finally:
    let finalbody = "";
    if (this.hasFinally_) {
        finalbody = "finally:\n" + (python.pythonGenerator.statementToCode(block, 'FINALBODY') || python.pythonGenerator.PASS);
    }
    return "try:\n" + body + handlers.join("") + orelse + finalbody;
};

BlockMirrorTextToBlocks.prototype['ast_Try'] = function (node, parent) {
    let body = node.body;
    let handlers = node.handlers;
    let orelse = node.orelse;
    let finalbody = node.finalbody;

    let fields = {};
    let values = {};
    let mutations = {
        "@ORELSE": orelse !== null  && orelse.length > 0,
        "@FINALBODY": finalbody !== null  && finalbody.length > 0,
        "@HANDLERS": handlers.length
    };

    let statements = {"BODY": this.convertBody(body, node)};
    if (orelse !== null) {
        statements['ORELSE'] = this.convertBody(orelse, node);
    }
    if (finalbody !== null && finalbody.length) {
        statements['FINALBODY'] = this.convertBody(finalbody, node);
    }

    let handledLevels = [];
    for (let i = 0; i < handlers.length; i++) {
        let handler = handlers[i];
        statements["HANDLER" + i] = this.convertBody(handler.body, node);
        if (handler.type === null) {
            handledLevels.push(BlockMirrorTextToBlocks.HANDLERS_CATCH_ALL);
        } else {
            values["TYPE" + i] = this.convert(handler.type, node);
            if (handler.name === null) {
                handledLevels.push(BlockMirrorTextToBlocks.HANDLERS_NO_AS);
            } else {
                handledLevels.push(BlockMirrorTextToBlocks.HANDLERS_COMPLETE);
                fields["NAME" + i] = Sk.ffi.remapToJs(handler.name.id);
            }
        }
    }

    mutations["ARG"] = handledLevels;

    return BlockMirrorTextToBlocks.create_block("ast_Try", node.lineno, fields,
        values, {}, mutations, statements);
};Blockly.Blocks["ast_Tuple"] = {
  /**
   * Block for creating a tuple with any number of elements of any type.
   * @this Blockly.Block
   */
  init: function () {
    this.setColour(BlockMirrorTextToBlocks.COLOR.TUPLE);
    this.itemCount_ = 3;
    this.updateShape_();
    this.setOutput(true, "Tuple");
    this.setMutator(
      new Blockly.icons.MutatorIcon(["ast_Tuple_create_with_item"], this),
    );
  },
  /**
   * Create XML to represent tuple inputs.
   * @return {!Element} XML storage element.
   * @this Blockly.Block
   */
  mutationToDom: function () {
    var container = document.createElement("mutation");
    container.setAttribute("items", this.itemCount_);
    return container;
  },
  /**
   * Parse XML to restore the tuple inputs.
   * @param {!Element} xmlElement XML storage element.
   * @this Blockly.Block
   */
  domToMutation: function (xmlElement) {
    this.itemCount_ = parseInt(xmlElement.getAttribute("items"), 10);
    this.updateShape_();
  },
  /**
   * Populate the mutator's dialog with this block's components.
   * @param {!Blockly.Workspace} workspace Mutator's workspace.
   * @return {!Blockly.Block} Root block in mutator.
   * @this Blockly.Block
   */
  decompose: function (workspace) {
    var containerBlock = workspace.newBlock("ast_Tuple_create_with_container");
    containerBlock.initSvg();
    var connection = containerBlock.getInput("STACK").connection;
    for (var i = 0; i < this.itemCount_; i++) {
      var itemBlock = workspace.newBlock("ast_Tuple_create_with_item");
      itemBlock.initSvg();
      connection.connect(itemBlock.previousConnection);
      connection = itemBlock.nextConnection;
    }
    return containerBlock;
  },
  /**
   * Reconfigure this block based on the mutator dialog's components.
   * @param {!Blockly.Block} containerBlock Root block in mutator.
   * @this Blockly.Block
   */
  compose: function (containerBlock) {
    var itemBlock = containerBlock.getInputTargetBlock("STACK");
    // Count number of inputs.
    var connections = [];
    while (itemBlock) {
      connections.push(itemBlock.valueConnection_);
      itemBlock =
        itemBlock.nextConnection && itemBlock.nextConnection.targetBlock();
    }
    // Disconnect any children that don't belong.
    for (var i = 0; i < this.itemCount_; i++) {
      var connection = this.getInput("ADD" + i).connection.targetConnection;
      if (connection && connections.indexOf(connection) == -1) {
        connection.disconnect();
      }
    }
    this.itemCount_ = connections.length;
    this.updateShape_();
    // Reconnect any child blocks.
    for (var i = 0; i < this.itemCount_; i++) {
      connections[i]?.reconnect(this, "ADD" + i);
    }
  },
  /**
   * Store pointers to any connected child blocks.
   * @param {!Blockly.Block} containerBlock Root block in mutator.
   * @this Blockly.Block
   */
  saveConnections: function (containerBlock) {
    var itemBlock = containerBlock.getInputTargetBlock("STACK");
    var i = 0;
    while (itemBlock) {
      var input = this.getInput("ADD" + i);
      itemBlock.valueConnection_ = input && input.connection.targetConnection;
      i++;
      itemBlock =
        itemBlock.nextConnection && itemBlock.nextConnection.targetBlock();
    }
  },
  /**
   * Modify this block to have the correct number of inputs.
   * @private
   * @this Blockly.Block
   */
  updateShape_: function () {
    if (this.itemCount_ && this.getInput("EMPTY")) {
      this.removeInput("EMPTY");
    } else if (!this.itemCount_ && !this.getInput("EMPTY")) {
      this.appendDummyInput("EMPTY").appendField("()");
    }
    // Add new inputs.
    for (var i = 0; i < this.itemCount_; i++) {
      if (!this.getInput("ADD" + i)) {
        var input = this.appendValueInput("ADD" + i);
        if (i === 0) {
          input.appendField("(").setAlign(Blockly.inputs.Align.RIGHT);
        } else {
          input.appendField(",").setAlign(Blockly.inputs.Align.RIGHT);
        }
      }
    }
    // Remove deleted inputs.
    while (this.getInput("ADD" + i)) {
      this.removeInput("ADD" + i);
      i++;
    }
    // Add the trailing "]"
    if (this.getInput("TAIL")) {
      this.removeInput("TAIL");
    }
    if (this.itemCount_) {
      let tail = this.appendDummyInput("TAIL");
      if (this.itemCount_ === 1) {
        tail.appendField(",)");
      } else {
        tail.appendField(")");
      }
      tail.setAlign(Blockly.inputs.Align.RIGHT);
    }
  },
};

Blockly.Blocks["ast_Tuple_create_with_container"] = {
  /**
   * Mutator block for tuple container.
   * @this Blockly.Block
   */
  init: function () {
    this.setColour(BlockMirrorTextToBlocks.COLOR.TUPLE);
    this.appendDummyInput().appendField("Add new tuple elements below");
    this.appendStatementInput("STACK");
    this.contextMenu = false;
  },
};

Blockly.Blocks["ast_Tuple_create_with_item"] = {
  /**
   * Mutator block for adding items.
   * @this Blockly.Block
   */
  init: function () {
    this.setColour(BlockMirrorTextToBlocks.COLOR.TUPLE);
    this.appendDummyInput().appendField("Element");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.contextMenu = false;
  },
};

python.pythonGenerator.forBlock["ast_Tuple"] = function (block, generator) {
  // Create a tuple with any number of elements of any type.
  var elements = new Array(block.itemCount_);
  for (var i = 0; i < block.itemCount_; i++) {
    elements[i] =
      python.pythonGenerator.valueToCode(
        block,
        "ADD" + i,
        python.pythonGenerator.ORDER_NONE,
      ) || python.pythonGenerator.blank;
  }
  let requiredComma = "";
  if (block.itemCount_ == 1) {
    requiredComma = ", ";
  }
  var code = "(" + elements.join(", ") + requiredComma + ")";
  return [code, python.pythonGenerator.ORDER_ATOMIC];
};

BlockMirrorTextToBlocks.prototype["ast_Tuple"] = function (node, parent) {
  var elts = node.elts;
  var ctx = node.ctx;

  return BlockMirrorTextToBlocks.create_block(
    "ast_Tuple",
    node.lineno,
    {},
    this.convertElements("ADD", elts, node),
    {
      inline: elts.length > 4 ? "false" : "true",
    },
    {
      "@items": elts.length,
    },
  );
};
BlockMirrorTextToBlocks.UNARYOPS = [
    ["+", "UAdd", 'Do nothing to the number'],
    ["-", "USub", 'Make the number negative'],
    ["not", "Not", 'Return the logical opposite of the value.'],
    ["~", "Invert", 'Take the bit inversion of the number']
];

BlockMirrorTextToBlocks.UNARYOPS.forEach(function (unaryop) {
    //Blockly.Constants.Math.TOOLTIPS_BY_OP[unaryop[1]] = unaryop[2];

    let fullName = "ast_UnaryOp" + unaryop[1];

    BlockMirrorTextToBlocks.BLOCKS.push({
        "type": fullName,
        "message0": unaryop[0] + " %1",
        "args0": [
            {"type": "input_value", "name": "VALUE"}
        ],
        "inputsInline": false,
        "output": null,
        "colour": (unaryop[1] === 'Not' ?
            BlockMirrorTextToBlocks.COLOR.LOGIC :
            BlockMirrorTextToBlocks.COLOR.MATH)
    });

    python.pythonGenerator.forBlock[fullName] = function (block) {
        // Basic arithmetic operators, and power.
        var order = (unaryop[1] === 'Not' ? python.pythonGenerator.ORDER_LOGICAL_NOT : python.pythonGenerator.ORDER_UNARY_SIGN);
        var argument1 = python.pythonGenerator.valueToCode(block, 'VALUE', order) || python.pythonGenerator.blank;
        var code = unaryop[0] + (unaryop[1] === 'Not' ? ' ' : '') + argument1;
        return [code, order];
    };
});

BlockMirrorTextToBlocks.prototype['ast_UnaryOp'] = function (node, parent) {
    let op = node.op.name;
    let operand = node.operand;

    return BlockMirrorTextToBlocks.create_block('ast_UnaryOp' + op, node.lineno, {}, {
        "VALUE": this.convert(operand, node)
    }, {
        "inline": false
    });
}Blockly.Blocks['ast_While'] = {
    init: function () {
        this.orelse_ = 0;
        this.appendValueInput('TEST')
            .appendField("while");
        this.appendStatementInput("BODY")
            .setCheck(null)
            .setAlign(Blockly.inputs.Align.RIGHT);
        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(BlockMirrorTextToBlocks.COLOR.CONTROL);
        this.updateShape_();
    },
    // TODO: Not mutable currently
    updateShape_: function () {
        let latestInput = "BODY";

        if (this.orelse_ && !this.getInput('ELSE')) {
            this.appendDummyInput('ORELSETEST')
                .appendField("else:");
            this.appendStatementInput("ORELSEBODY")
                .setCheck(null);
        } else if (!this.orelse_ && this.getInput('ELSE')) {
            block.removeInput('ORELSETEST');
            block.removeInput('ORELSEBODY');
        }
    },
    /**
     * Create XML to represent the (non-editable) name and arguments.
     * @return {!Element} XML storage element.
     * @this Blockly.Block
     */
    mutationToDom: function () {
        let container = document.createElement('mutation');
        container.setAttribute('orelse', this.orelse_);
        return container;
    },
    /**
     * Parse XML to restore the (non-editable) name and parameters.
     * @param {!Element} xmlElement XML storage element.
     * @this Blockly.Block
     */
    domToMutation: function (xmlElement) {
        this.orelse_ = "true" === xmlElement.getAttribute('orelse');
        this.updateShape_();
    },
};

python.pythonGenerator.forBlock['ast_While'] = function(block, generator) {
    // Test
    let test = "while " + (python.pythonGenerator.valueToCode(block, 'TEST',
        python.pythonGenerator.ORDER_NONE) || python.pythonGenerator.blank) + ":\n";
    // Body:
    let body = python.pythonGenerator.statementToCode(block, 'BODY') || python.pythonGenerator.PASS;
    // Orelse:
    let orelse = "";
    if (this.orelse_) {
        orelse = "else:\n" + (python.pythonGenerator.statementToCode(block, 'ORELSEBODY') || python.pythonGenerator.PASS);
    }
    return test + body + orelse;
};

BlockMirrorTextToBlocks.prototype['ast_While'] = function (node, parent) {
    let test = node.test;
    let body = node.body;
    let orelse = node.orelse;

    let values = {"TEST": this.convert(test, node)};
    let statements = {"BODY": this.convertBody(body, node)};

    let hasOrelse = false;
    if (orelse !== null && orelse.length > 0) {
        statements['ORELSEBODY'] = this.convertBody(orelse, node);
        hasOrelse = true;
    }

    return BlockMirrorTextToBlocks.create_block("ast_While", node.lineno, {},
        values, {}, {
            "@orelse": hasOrelse
        }, statements);
};BlockMirrorTextToBlocks.BLOCKS.push({
    "type": "ast_WithItem",
    "output": "WithItem",
    "message0": "context %1",
    "args0": [{"type": "input_value", "name": "CONTEXT"}],
    "enableContextMenu": false,
    "colour": BlockMirrorTextToBlocks.COLOR.CONTROL,
    "inputsInline": false,
});
python.pythonGenerator.forBlock["ast_WithItem"] = function (block) {
    let context = python.pythonGenerator.valueToCode(block, 'CONTEXT',
        python.pythonGenerator.ORDER_NONE) || python.pythonGenerator.blank;
    return [context, python.pythonGenerator.ORDER_NONE];
};
BlockMirrorTextToBlocks.BLOCKS.push({
    "type": "ast_WithItemAs",
    "output": "WithItem",
    "message0": "context %1 as %2",
    "args0": [{"type": "input_value", "name": "CONTEXT"},
        {"type": "input_value", "name": "AS"}],
    "enableContextMenu": false,
    "colour": BlockMirrorTextToBlocks.COLOR.CONTROL,
    "inputsInline": true,
});
python.pythonGenerator.forBlock["ast_WithItemAs"] = function (block) {
    let context = python.pythonGenerator.valueToCode(block, 'CONTEXT',
        python.pythonGenerator.ORDER_NONE) || python.pythonGenerator.blank;
    let as = python.pythonGenerator.valueToCode(block, 'AS',
        python.pythonGenerator.ORDER_NONE) || python.pythonGenerator.blank;
    return [context + " as " + as, python.pythonGenerator.ORDER_NONE];
};

Blockly.Blocks['ast_With'] = {
    init: function () {
        this.appendValueInput('ITEM0')
            .appendField("with");
        this.appendStatementInput("BODY")
            .setCheck(null);
        this.itemCount_ = 1;
        this.renames_ = [false];
        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(BlockMirrorTextToBlocks.COLOR.CONTROL);
        this.updateShape_();
    },
    /**
     * Create XML to represent list inputs.
     * @return {!Element} XML storage element.
     * @this Blockly.Block
     */
    mutationToDom: function () {
        var container = document.createElement('mutation');
        container.setAttribute('items', this.itemCount_);
        for (let i = 0; i < this.itemCount_; i++) {
            let parameter = document.createElement('as');
            parameter.setAttribute('name', this.renames_[i]);
            container.appendChild(parameter);
        }
        return container;
    },
    /**
     * Parse XML to restore the list inputs.
     * @param {!Element} xmlElement XML storage element.
     * @this Blockly.Block
     */
    domToMutation: function (xmlElement) {
        this.itemCount_ = parseInt(xmlElement.getAttribute('items'), 10);
        this.renames_ = [];
        for (let i = 0, childNode; childNode = xmlElement.childNodes[i]; i++) {
            if (childNode.nodeName.toLowerCase() === 'as') {
                this.renames_.push("true" === childNode.getAttribute('name'));
            }
        }
        this.updateShape_();
    },
    updateShape_: function () {
        // With clauses
        for (var i = 1; i < this.itemCount_; i++) {
            let input = this.getInput('ITEM' + i);
            if (!input) {
                input = this.appendValueInput('ITEM' + i);
            }
        }
        // Remove deleted inputs.
        while (this.getInput('ITEM' + i)) {
            this.removeInput('ITEM' + i);
            i++;
        }
        // Reposition everything
        for (i = 0; i < this.itemCount_; i++) {
            this.moveInputBefore('ITEM' + i, 'BODY');
        }
    },
};

python.pythonGenerator.forBlock['ast_With'] = function(block, generator) {
    // Contexts
    let items = new Array(block.itemCount_);
    for (let i = 0; i < block.itemCount_; i++) {
        items[i] = (python.pythonGenerator.valueToCode(block, 'ITEM' + i, python.pythonGenerator.ORDER_NONE) ||
            python.pythonGenerator.blank);
    }
    // Body
    let body = python.pythonGenerator.statementToCode(block, 'BODY') || python.pythonGenerator.PASS;
    return "with " + items.join(', ') + ":\n" + body;
};

BlockMirrorTextToBlocks.prototype['ast_With'] = function (node, parent) {
    let items = node.items;
    let body = node.body;

    let values = {};
    let mutations = {"@items": items.length};

    let renamedItems = [];
    for (let i = 0; i < items.length; i++) {
        let hasRename = items[i].optional_vars;
        renamedItems.push(hasRename);
        let innerValues = {'CONTEXT':this.convert(items[i].context_expr, node)};
        if (hasRename) {
            innerValues['AS'] = this.convert(items[i].optional_vars, node);
            values['ITEM'+i] = BlockMirrorTextToBlocks.create_block("ast_WithItemAs", node.lineno,
                {}, innerValues, this.LOCKED_BLOCK);
        } else {
            values['ITEM'+i] = BlockMirrorTextToBlocks.create_block("ast_WithItem", node.lineno,
                {}, innerValues, this.LOCKED_BLOCK);
        }
    }
    mutations['as'] = renamedItems;

    return BlockMirrorTextToBlocks.create_block("ast_With", node.lineno, {},
        values,
        {
            "inline": "false"
        }, mutations, {
            'BODY': this.convertBody(body, node)
        });
};
BlockMirrorTextToBlocks.BLOCKS.push({
    "type": "ast_YieldFull",
    "message0": "yield %1",
    "args0": [
        {"type": "input_value", "name": "VALUE"}
    ],
    "inputsInline": false,
    "output": null,
    "colour": BlockMirrorTextToBlocks.COLOR.FUNCTIONS,
});

BlockMirrorTextToBlocks.BLOCKS.push({
    "type": "ast_Yield",
    "message0": "yield",
    "inputsInline": false,
    "output": null,
    "colour": BlockMirrorTextToBlocks.COLOR.FUNCTIONS,
});

python.pythonGenerator.forBlock['ast_Yield'] = function(block, generator) {
    return ["yield", python.pythonGenerator.ORDER_LAMBDA];
};

python.pythonGenerator.forBlock['ast_YieldFull'] = function(block, generator) {
    var value = python.pythonGenerator.valueToCode(block, 'VALUE', python.pythonGenerator.ORDER_LAMBDA) || python.pythonGenerator.blank;
    return ["yield " + value, python.pythonGenerator.ORDER_LAMBDA];
};

BlockMirrorTextToBlocks.prototype['ast_Yield'] = function (node, parent) {
    let value = node.value;

    if (value == null) {
        return BlockMirrorTextToBlocks.create_block("ast_Yield", node.lineno);
    } else {
        return BlockMirrorTextToBlocks.create_block("ast_YieldFull", node.lineno, {}, {
            "VALUE": this.convert(value, node)
        });
    }
};BlockMirrorTextToBlocks.BLOCKS.push({
    "type": "ast_YieldFrom",
    "message0": "yield from %1",
    "args0": [
        {"type": "input_value", "name": "VALUE"}
    ],
    "inputsInline": false,
    "output": null,
    "colour": BlockMirrorTextToBlocks.COLOR.FUNCTIONS,
});

python.pythonGenerator.forBlock['ast_YieldFrom'] = function(block, generator) {
    var value = python.pythonGenerator.valueToCode(block, 'VALUE', python.pythonGenerator.ORDER_LAMBDA) || python.pythonGenerator.blank;
    return ["yield from " + value, python.pythonGenerator.ORDER_LAMBDA];
};

BlockMirrorTextToBlocks.prototype['ast_YieldFrom'] = function (node, parent) {
    let value = node.value;

    return BlockMirrorTextToBlocks.create_block("ast_YieldFrom", node.lineno, {}, {
        "VALUE": this.convert(value, node)
    });
};BlockMirrorTextToBlocks['ast_Image'] = function (node, parent, bmttb) {
    if (!bmttb.blockMirror.configuration.imageMode) {
        throw "Not using image constructor";
    }
    if (node.args.length !== 1) {
        throw "More than one argument to Image constructor";
    }
    if (node.args[0]._astname !== "Str") {
        throw "First argument for Image constructor must be string literal";
    }
    return BlockMirrorTextToBlocks.create_block("ast_Image", node.lineno, {}, {}, {},
        {"@src": Sk.ffi.remapToJs(node.args[0].s)});
};


BlockMirrorTextToBlocks.prototype.FUNCTION_SIGNATURES = {
    'abs': {
        'returns': true,
        'full': ['x'], colour: BlockMirrorTextToBlocks.COLOR.MATH
    },
    'all': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.LOGIC},
    'any': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.LOGIC},
    'ascii': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.TEXT},
    'bin': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.MATH},
    'bool': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.LOGIC,
    simple: ['x']},
    'breakpoint': {returns: false, colour: BlockMirrorTextToBlocks.COLOR.PYTHON},
    'bytearray': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.TEXT},
    'bytes': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.TEXT},
    'callable': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.LOGIC},
    'chr': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.TEXT},
    'classmethod': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.OO},
    'compile': {returns: false, colour: BlockMirrorTextToBlocks.COLOR.PYTHON},
    'complex': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.MATH},
    'delattr': {returns: false, colour: BlockMirrorTextToBlocks.COLOR.VARIABLES},
    'dict': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.DICTIONARY},
    'dir': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.PYTHON},
    'divmod': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.MATH},
    'enumerate': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.SEQUENCES},
    'eval': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.PYTHON},
    'exec': {returns: false, colour: BlockMirrorTextToBlocks.COLOR.PYTHON},
    'filter': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.SEQUENCES},
    'float': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.MATH,
    simple: ['x']},
    'format': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.TEXT},
    'frozenset': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.SEQUENCES},
    'getattr': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.OO},
    'globals': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.VARIABLES},
    'hasattr': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.OO},
    'hash': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.MATH},
    'help': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.PYTHON},
    'hex': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.MATH},
    'id': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.PYTHON},
    'Image': {custom: BlockMirrorTextToBlocks.ast_Image},
    'input': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.FILE,
    simple: ['prompt']},
    'int': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.MATH,
    simple: ['x']},
    'isinstance': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.LOGIC},
    'issubclass': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.LOGIC},
    'iter': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.SEQUENCES},
    'len': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.SEQUENCES},
    'list': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.LIST},
    'locals': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.VARIABLES},
    'map': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.SEQUENCES},
    'max': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.MATH},
    'memoryview': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.PYTHON},
    'min': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.MATH},
    'next': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.SEQUENCES},
    'object': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.OO},
    'oct': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.MATH},
    'open': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.FILE},
    'ord': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.TEXT},
    'pow': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.MATH},
    'print': {returns: false, colour: BlockMirrorTextToBlocks.COLOR.FILE,
    simple: ['message'], full: ['*messages', 'sep', 'end', 'file', 'flush']},
    'property': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.OO},
    'range': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.SEQUENCES,
    simple: ['stop'], full: ['start', 'stop', 'step']},
    'repr': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.TEXT},
    'reversed': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.SEQUENCES},
    'round': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.MATH,
    full: ['x', 'ndigits'],
    simple: ['x']},
    'set': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.SET},
    'setattr': {
        'returns': false,
        'full': ['object', 'name', 'value'], colour: BlockMirrorTextToBlocks.COLOR.OO
    },
    'slice': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.SEQUENCES},
    'sorted': {
        'full': ['iterable', '*', '**key', '**reverse'],
        'simple': ['iterable'],
        'returns': true,
        colour: BlockMirrorTextToBlocks.COLOR.SEQUENCES
    },
    'staticmethod': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.OO},
    'str': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.TEXT,
    simple: ['x']},
    'sum': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.MATH},
    'super': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.OO},
    'tuple': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.TUPLE},
    'type': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.OO},
    'vars': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.VARIABLES},
    'zip': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.SEQUENCES},
    '__import__': {returns: false, colour: BlockMirrorTextToBlocks.COLOR.PYTHON}


};

BlockMirrorTextToBlocks.prototype.METHOD_SIGNATURES = {
    'conjugate': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.MATH},
    'trunc': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.MATH},
    'floor': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.MATH},
    'ceil': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.MATH},
    'bit_length': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.MATH},
    'to_bytes': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.MATH},
    'from_bytes': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.MATH},
    'as_integer_ratio': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.MATH},
    'is_integer': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.MATH},
    'hex': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.MATH},
    'fromhex': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.MATH},
    '__iter__': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.SEQUENCES},
    '__next__': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.SEQUENCES},
    'index': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.LIST},
    'count': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.LIST},
    'append': {
        'returns': false,
        'full': ['x'],
        'message': 'append',
        'premessage': 'to list', colour: BlockMirrorTextToBlocks.COLOR.LIST
    },
    'clear': {returns: false, colour: BlockMirrorTextToBlocks.COLOR.SEQUENCES},
    'copy': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.LIST},
    'extend': {returns: false, colour: BlockMirrorTextToBlocks.COLOR.LIST},
    'insert': {returns: false, colour: BlockMirrorTextToBlocks.COLOR.LIST},
    'pop': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.SEQUENCES},
    'remove': {returns: false, colour: BlockMirrorTextToBlocks.COLOR.SEQUENCES},
    'reverse': {returns: false, colour: BlockMirrorTextToBlocks.COLOR.LIST},
    'sort': {returns: false, colour: BlockMirrorTextToBlocks.COLOR.LIST},
    'capitalize': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.TEXT},
    'casefold': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.TEXT},
    'center': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.TEXT},
    'encode': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.TEXT},
    'endswith': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.TEXT},
    'expandtabs': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.TEXT},
    'find': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.TEXT},
    'format': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.TEXT},
    'format_map': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.TEXT},
    'isalnum': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.TEXT},
    'isalpha': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.TEXT},
    'isascii': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.TEXT},
    'isdecimal': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.TEXT},
    'isdigit': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.TEXT},
    'isidentifier': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.TEXT},
    'islower': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.TEXT},
    'isnumeric': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.TEXT},
    'isprintable': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.TEXT},
    'isspace': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.TEXT},
    'istitle': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.TEXT},
    'isupper': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.TEXT},
    'join': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.TEXT},
    'ljust': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.TEXT},
    'lower': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.TEXT},
    'lstrip': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.TEXT},
    'maketrans': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.TEXT},
    'partition': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.TEXT},
    'replace': {
        'returns': true,
        'full': ['old', 'new', 'count'],
        'simple': ['old', 'new'], colour: BlockMirrorTextToBlocks.COLOR.TEXT
    },
    'rfind': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.TEXT},
    'rindex': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.TEXT},
    'rjust': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.TEXT},
    'rpartition': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.TEXT},
    'rsplit': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.TEXT},
    'rstrip': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.TEXT},
    'split': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.TEXT},
    'splitlines': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.TEXT},
    'startswith': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.TEXT},
    'strip': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.TEXT},
    'swapcase': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.TEXT},
    'title': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.TEXT},
    'translate': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.TEXT},
    'upper': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.TEXT},
    'zfill': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.TEXT},
    'decode': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.TEXT},
    '__eq__': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.LOGIC},
    'tobytes': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.PYTHON},
    'tolist': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.PYTHON},
    'release': {returns: false, colour: BlockMirrorTextToBlocks.COLOR.PYTHON},
    'cast': {returns: false, colour: BlockMirrorTextToBlocks.COLOR.PYTHON},
    'isdisjoint': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.SET},
    'issubset': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.SET},
    'issuperset': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.SET},
    'union': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.SET},
    'intersection': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.SET},
    'difference': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.SET},
    'symmetric_difference': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.SET},
    'update': {returns: false, colour: BlockMirrorTextToBlocks.COLOR.SET},
    'intersection_update': {returns: false, colour: BlockMirrorTextToBlocks.COLOR.SET},
    'difference_update': {returns: false, colour: BlockMirrorTextToBlocks.COLOR.SET},
    'symmetric_difference_update': {returns: false, colour: BlockMirrorTextToBlocks.COLOR.SET},
    'add': {returns: false, colour: BlockMirrorTextToBlocks.COLOR.SET},
    'discard': {returns: false, colour: BlockMirrorTextToBlocks.COLOR.SET},
    'fromkeys': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.DICTIONARY},
    'get': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.DICTIONARY},
    'items': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.DICTIONARY},
    'keys': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.DICTIONARY},
    'popitem': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.DICTIONARY},
    'setdefault': {returns: false, colour: BlockMirrorTextToBlocks.COLOR.DICTIONARY},
    'values': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.DICTIONARY},
    '__enter__': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.CONTROL},
    '__exit__': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.CONTROL},
    'mro': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.OO},
    '__subclasses__': {returns: true, colour: BlockMirrorTextToBlocks.COLOR.OO},
};


BlockMirrorTextToBlocks.prototype.MODULE_FUNCTION_IMPORTS = {
    "plt": "import matplotlib.pyplot as plt",
    "turtle": "import turtle"
};

BlockMirrorTextToBlocks.prototype.MODULE_FUNCTION_SIGNATURES = {
    "cisc108": {
        'assert_equal': {
            returns: false,
            simple: ["left", "right"],
            message: "assert_equal",
            colour: BlockMirrorTextToBlocks.COLOR.PYTHON
        }
    },
    "turtle": {},
    'plt': {
        'show': {
            returns: false,
            simple: [],
            message: 'show plot canvas',
            colour: BlockMirrorTextToBlocks.COLOR.PLOTTING
        },
        'hist': {
            returns: false,
            simple: ['values'],
            message: 'plot histogram',
            colour: BlockMirrorTextToBlocks.COLOR.PLOTTING
        },
        'bar': {
            returns: false,
            simple: ['xs', 'heights', '*tick_label'],
            message: 'plot bar chart',
            colour: BlockMirrorTextToBlocks.COLOR.PLOTTING
        },
        'plot': {
            returns: false,
            simple: ['values'],
            message: 'plot line',
            colour: BlockMirrorTextToBlocks.COLOR.PLOTTING
        },
        'boxplot': {
            returns: false,
            simple: ['values'],
            message: 'plot boxplot',
            colour: BlockMirrorTextToBlocks.COLOR.PLOTTING
        },
        'hlines': {
            returns: false,
            simple: ['y', 'xmin', 'xmax'],
            message: 'plot horizontal line',
            colour: BlockMirrorTextToBlocks.COLOR.PLOTTING
        },
        'vlines': {
            returns: false,
            simple: ['x', 'ymin', 'ymax'],
            message: 'plot vertical line',
            colour: BlockMirrorTextToBlocks.COLOR.PLOTTING
        },
        'scatter': {
            returns: false,
            simple: ['xs', 'ys'],
            message: 'plot scatter',
            colour: BlockMirrorTextToBlocks.COLOR.PLOTTING
        },
        'title': {
            returns: false,
            simple: ['label'],
            message: "make plot's title",
            colour: BlockMirrorTextToBlocks.COLOR.PLOTTING
        },
        'xlabel': {
            returns: false,
            simple: ['label'],
            message: "make plot's x-axis label",
            colour: BlockMirrorTextToBlocks.COLOR.PLOTTING
        },
        'ylabel': {
            returns: false,
            simple: ['label'],
            message: "make plot's y-axis label",
            colour: BlockMirrorTextToBlocks.COLOR.PLOTTING
        },
        'xticks': {
            returns: false,
            simple: ['xs', 'labels', '*rotation'],
            message: "make x ticks",
            colour: BlockMirrorTextToBlocks.COLOR.PLOTTING
        },
        'yticks': {
            returns: false,
            simple: ['ys', 'labels', '*rotation'],
            message: "make y ticks",
            colour: BlockMirrorTextToBlocks.COLOR.PLOTTING
        }
    }
};

BlockMirrorTextToBlocks.prototype.FUNCTION_SIGNATURES['assert_equal'] =
    BlockMirrorTextToBlocks.prototype.MODULE_FUNCTION_SIGNATURES['cisc108']['assert_equal'];

function makeTurtleBlock(name, returns, values, message, aliases) {
    BlockMirrorTextToBlocks.prototype.MODULE_FUNCTION_SIGNATURES['turtle'][name] = {
        "returns": returns,
        "simple": values,
        "message": message,
        colour: BlockMirrorTextToBlocks.COLOR.PLOTTING
    };
    if (aliases) {
        aliases.forEach(function(alias) {
            BlockMirrorTextToBlocks.prototype.MODULE_FUNCTION_SIGNATURES['turtle'][alias] =
                BlockMirrorTextToBlocks.prototype.MODULE_FUNCTION_SIGNATURES['turtle'][name];
        });
    }
}

makeTurtleBlock("forward", false, ["amount"], "move turtle forward by", ["fd"]);
makeTurtleBlock("backward", false, ["amount"], "move turtle backward by", ["bd"]);
makeTurtleBlock("right", false, ["angle"], "turn turtle right by", ["rt"]);
makeTurtleBlock("left", false, ["angle"], "turn turtle left by", ["lt"]);
makeTurtleBlock("goto", false, ["x", "y"], "move turtle to position", ["setpos", "setposition"]);
makeTurtleBlock("setx", false, ["x"], "set turtle's x position to ", []);
makeTurtleBlock("sety", false, ["y"], "set turtle's y position to ", []);
makeTurtleBlock("setheading", false, ["angle"], "set turtle's heading to ", ["seth"]);
makeTurtleBlock("home", false, [], "move turtle to origin ", []);
makeTurtleBlock("circle", false, ["radius"], "move the turtle in a circle ", []);
makeTurtleBlock("dot", false, ["size", "color"], "turtle draws a dot ", []);
makeTurtleBlock("stamp", true, [], "stamp a copy of the turtle shape ", []);
makeTurtleBlock("clearstamp", false, ["stampid"], "delete stamp with id ", []);
makeTurtleBlock("clearstamps", false, [], "delete all stamps ", []);
makeTurtleBlock("undo", false, [], "undo last turtle action ", []);
makeTurtleBlock("speed", true, ["x"], "set or get turtle speed", []);
makeTurtleBlock("position", true, [], "get turtle's position ", ["pos"]);
makeTurtleBlock("towards", true, ["x", "y"], "get the angle from the turtle to the point ", []);
makeTurtleBlock("xcor", true, [], "get turtle's x position ", []);
makeTurtleBlock("ycor", true, [], "get turtle's y position ", []);
makeTurtleBlock("heading", true, [], "get turtle's heading ", []);
makeTurtleBlock("distance", true, ["x", "y"], "get the distance from turtle's position to ", []);
makeTurtleBlock("degrees", false, [], "set turtle mode to degrees", []);
makeTurtleBlock("radians", false, [], "set turtle mode to radians", []);
makeTurtleBlock("pendown", false, [], "pull turtle pen down ", ["pd", "down"]);
makeTurtleBlock("penup", false, [], "pull turtle pen up ", ["pu", "up"]);
// Skipped some
makeTurtleBlock("pensize", false, [], "set or get the pen size ", ["width"]);
// Skipped some
makeTurtleBlock("pencolor", false, [], "set or get the pen color ", []);
makeTurtleBlock("fillcolor", false, [], "set or get the fill color ", []);
makeTurtleBlock("reset", false, [], "reset drawing", []);
makeTurtleBlock("clear", false, [], "clear drawing", []);
makeTurtleBlock("write", false, ["message"], "write text ", []);
// Skipped some
makeTurtleBlock("bgpic", false, ["url"], "set background to ", []);
makeTurtleBlock("done", false, [], "start the turtle loop ", ["mainloop"]);
makeTurtleBlock("setup", false, ["width", "height"], "set drawing area size ", []);
makeTurtleBlock("title", false, ["message"], "set title of drawing area ", []);
makeTurtleBlock("bye", false, [], "say goodbye to turtles ", []);


BlockMirrorTextToBlocks.prototype.MODULE_FUNCTION_SIGNATURES['matplotlib.pyplot'] =
    BlockMirrorTextToBlocks.prototype.MODULE_FUNCTION_SIGNATURES['plt'];

BlockMirrorTextToBlocks.getFunctionBlock = function(name, values, module) {
    if (values === undefined) {
        values = {};
    }
    // TODO: hack, we shouldn't be accessing the prototype like this
    let signature;
    let method = false;
    if (module !== undefined) {
        signature = BlockMirrorTextToBlocks.prototype.MODULE_FUNCTION_SIGNATURES[module][name];
    } else if (name.startsWith('.')) {
        signature = BlockMirrorTextToBlocks.prototype.METHOD_SIGNATURES[name.substr(1)];
        method = true;
    } else {
        signature = BlockMirrorTextToBlocks.prototype.FUNCTION_SIGNATURES[name];
    }
    let args = (signature.simple !== undefined ? signature.simple :
               signature.full !== undefined ? signature.full : []);
    let argumentsMutation = {
        "@arguments": args.length,
        "@returns": (signature.returns || false),
        "@parameters": true,
        "@method": method,
        "@name": module ? module+"."+name : name,
        "@message": signature.message ? signature.message : name,
        "@premessage": signature.premessage ? signature.premessage : "",
        "@colour": signature.colour ? signature.colour : 0,
        "@module": module || ""
    };
    for (let i = 0; i < args.length; i += 1) {
        argumentsMutation["UNKNOWN_ARG:" + i] = null;
    }
    let newBlock = BlockMirrorTextToBlocks.create_block("ast_Call", null, {},
        values, {inline: true}, argumentsMutation);
    // Return as either statement or expression
    return BlockMirrorTextToBlocks.xmlToString(newBlock);
};
