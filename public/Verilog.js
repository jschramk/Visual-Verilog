class PortHolder {

    constructor() {
        this.portList = [];
    }

    insertPort(name, size, input, index) {
        var port = new Port(name, size, input);
        //this.ports.set(name, port);
        this.portList.splice(index, 0, port);
    }

    addPort(name, size, input) {
        this.insertPort(name, size, input, this.portCount());
    }

    getPort(index) {
        return this.portList[index];
    }

    portCount() {
        return this.portList.length;
    }

    removePort(index) {
        this.portList.splice(index, 1);
    }

    clearPorts() {
        this.portList = [];
    }

    static getPortWidthText(size) {

        if (size <= 1) {
            return "";
        }

        return `[${size - 1}:0]`;

    }

}

class Position {

    constructor() {
        this.x = 0;
        this.y = 0;
        this.width = 0;
        this.height = 0;
    }

    setHeight(height) {
        this.height = height;
    }

    setWidth(width) {
        this.width = width;
    }

    setX(x) {
        this.x = x;
    }

    setY(y) {
        this.y = y;
    }

}

class Concatenator extends PortHolder {

    constructor() {
        super();
        this.position = new Position();
    }

    getSize() {

        var size = 0;

        for(var i = 0; i < this.portCount(); i++) {

            size += this.getPort().size;

        }

        return size;

    }

}

class Module extends PortHolder{

    constructor() {
        super();
        this.name = "module_name";
    }

    setName(name) {
        this.name = name;
    }

    toVerilogHeader() {

        var code = `module ${this.name} (`;

        for (var i = 0; i < this.portCount(); i++) {

            var port = this.getPort(i);

            if (i > 0) {
                code += ",";
            }

            code += `\n    ${port.name}`;

        }

        code += "\n);\n";

        for (var i = 0; i < this.portCount(); i++) {

            var port = this.getPort(i);

            code += "\n" + port.getPortDeclaration() + ";";

        }

        return code;

    }

}

class ModuleInstance {

    constructor(moduleId) {
        this.moduleId = moduleId;
        this.name = "iMODULE_INSTANCE";
        this.position = new Position();
    }

    setName(name) {
        this.name = name;
    }

    getModuleId() {
        return this.moduleId;
    }

}

class Port {

    static checkPortCompatible(port1, port2) {
        return port1.size == port2.size && port1.input != port2.input;
    }

    getPortDeclaration() {

        return `${this.input ? "input" : "output"}${this.size > 1 ? ` [${this.size - 1}:0]` : ""} ${this.name}`;

    }

    constructor(name, size, input) {
        this.name = name;
        this.size = size;
        this.input = input;
    }

}

class Wire {

    constructor(startModuleInstanceId, startModuleId, startPortIndex, endModuleInstanceId, endModuleId, endPortIndex, size) {
        this.startModuleInstanceId = startModuleInstanceId;
        this.startModuleId = startModuleId;
        this.startPortIndex = startPortIndex;
        this.endModuleInstanceId = endModuleInstanceId;
        this.endModuleId = endModuleId;
        this.endPortIndex = endPortIndex;
        this.size = size;
    }

}

class VerilogWorkspace {

    constructor() {
        this.nextObjectId = 0;
        this.modules = new Map();
        this.moduleInstances = new Map();
        this.wires = new Map();
    }

    getModuleFromInstance(id) {
        return this.getModule(this.getModuleInstance(id).getModuleId());
    }

    // modules
    addModule(module) {
        this.modules.set(this.nextObjectId, module);
        return this.nextObjectId++;
    }

    getModule(id) {
        return this.modules.get(id);
    }

    removeModule(id) {
        this.modules.delete(id);
        this.removeWires(id, -1, -1);
    }

    moduleIds() {
        return this.modules.keys();
    }


    // module instances
    addModuleInstance(moduleInstance) {
        this.moduleInstances.set(this.nextObjectId, moduleInstance);
        return this.nextObjectId++;
    }

    getModuleInstance(id) {
        return this.moduleInstances.get(id);
    }

    removeModuleInstance(id) {
        this.moduleInstances.delete(id);
        this.removeWires(-1, id, -1);
    }

    moduleInstanceIds() {
        return this.moduleInstances.keys();
    }


    // wires
    addWire(wireInstance) {
        this.wires.set(this.nextObjectId, wireInstance);
        return this.nextObjectId++;
    }

    getWire(id) {
        return this.wires.get(id);
    }

    removeWire(id) {
        this.wires.delete(id);
    }

    wireIds() {
        return this.wires.keys();
    }

    removeWires(moduleId, moduleInstanceId, portIndex) {

        var wiresToRemove = [];

        for (var id of this.wireIds()) {

            var wire = this.getWire(id);

            if (portIndex != -1) { // remove all wires attached to this specific module instance and port

                if ((wire.startModuleInstanceId == moduleInstanceId && wire.startPortIndex == i) || (wire.endModuleInstanceId == moduleInstanceId && wire.endPortIndex == i)) {
                    wiresToRemove.push(id);
                }

            } else if (moduleInstanceId != -1) { // remove all wires attached to this specific module instance

                if (wire.startModuleInstanceId == moduleInstanceId || wire.endModuleInstanceId == moduleInstanceId) {
                    wiresToRemove.push(id);
                }

            } else { // remove all wires attached to any instance of this module

                if (wire.startModuleId == moduleId || wire.endModuleId == moduleId) {
                    wiresToRemove.push(id);
                }

            }

        }

        for (var i = 0; i < wiresToRemove.length; i++) {
            this.removeWire(wiresToRemove[i]);
        }

    }



}

