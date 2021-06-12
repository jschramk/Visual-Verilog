"use strict";

function Canvas() {

    var canvas = document.getElementById("canvas");
    var ctx = canvas.getContext("2d");

    canvas.width = parseFloat(canvas.style.width);
    canvas.height = parseFloat(canvas.style.height);

    // mouse position variable
    var mousePos = {
        x: 0, y: 0
    }

    // boolean for mouse down/up
    var mouseDown = false;

    // screen refresh rate in hz
    var refreshRate = 144;

    function updateMousePos(evt) {
        var rect = canvas.getBoundingClientRect();
        mousePos.x = evt.clientX - rect.left;
        mousePos.y = evt.clientY - rect.top;
    }

    // start tool objects ------------------------------------------------------------------------------------------------------------------------------------------------------

    // start positions for various actions
    // (might be able to use the same variable here)
    var wireStartPos = null;
    var dragStartPos = null;
    var moveStartPos = null;

    // booleans for actions
    var movingModule = false;
    var creatingModule = false;
    var creatingWire = false;

    var wireStartModuleInstanceId = -1;
    var wireStartPortIndex = -1;
    var wireStartPort = null;

    var hoveredModuleInstanceId = -1;
    var selectedModuleInstanceId = -1;
    var hoveredPortIndex = -1;
    var hoveredWireId = -1;

    // size of ports on module
    var portWidth = 25;
    var portHeight = 25;

    // workspace for verilog objects
    var verilogWorkspace = new VerilogWorkspace();

    // end tool objects --------------------------------------------------------------------------------------------------------------------------------------------------------

    // start html inputs -----------------------------------------------------------------------------------------------------------------------------------------

    var moduleNameTextArea = document.getElementById("moduleName");
    var moduleInstanceNameTextArea = document.getElementById("moduleInstanceName");
    var portNameTextArea = document.getElementById("newPortName");
    var portSizeTextArea = document.getElementById("newPortSize");
    var addPortButton = document.getElementById("addPortButton");
    var clearPortsButton = document.getElementById("clearPortsButton");
    var previewCodeButton = document.getElementById("previewCodeButton");
    var codePreviewTextArea = document.getElementById("codePreviewTextArea");

    // end html inputs -------------------------------------------------------------------------------------------------------------------------------------------

    init();

    function init() {

        // init document listeners
        document.addEventListener('keydown', handleShortcutKey);

        // init canvas listeners
        canvas.addEventListener('mousemove', handleMouseMove, false);
        canvas.addEventListener('mousedown', handleMouseDown, false);
        canvas.addEventListener('mouseup', handleMouseUp, false);

        // init button listeners
        addPortButton.addEventListener('click', handlePortsAdded, false);
        clearPortsButton.addEventListener('click', handlePortsCleared, false);

        previewCodeButton.addEventListener('click', function () {

            if (selectedModuleInstanceId == -1) return;

            var moduleInstance = verilogWorkspace.getModuleInstance(selectedModuleInstanceId);
            var module = verilogWorkspace.getModuleFromInstance(selectedModuleInstanceId);

            codePreviewTextArea.value = module.toVerilogHeader();

        }, false);

        moduleNameTextArea.addEventListener('input', function (e) {

            if (selectedModuleInstanceId != -1) {

                var moduleInstance = verilogWorkspace.getModuleInstance(selectedModuleInstanceId);

                var module = verilogWorkspace.getModuleFromInstance(selectedModuleInstanceId);

                module.setName(moduleNameTextArea.value);

            }

        }, false);

        moduleInstanceNameTextArea.addEventListener('input', function (e) {

            if (selectedModuleInstanceId != -1) {

                var moduleInstance = verilogWorkspace.getModuleInstance(selectedModuleInstanceId);

                moduleInstance.setName(moduleInstanceNameTextArea.value);

            }

        }, false);

        // redraw screen at refresh rate
        setInterval(drawAll, 1000 / refreshRate);

    }

    // start mouse handlers -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

    function handleMouseMove(evt) {
        updateMousePos(evt);

        updateSelection();

    }

    function handleMouseDown(evt) {
        updateMousePos(evt);
        mouseDown = true;

        dragStartPos = {
            x: mousePos.x, y: mousePos.y
        };

        selectedModuleInstanceId = -1;

        if (hoveredModuleInstanceId != -1) {

            if (hoveredPortIndex != -1) {

                creatingWire = true;

                wireStartPos = getPortPosition(hoveredModuleInstanceId, hoveredPortIndex);

                wireStartModuleInstanceId = hoveredModuleInstanceId;
                wireStartPortIndex = hoveredPortIndex;

                wireStartPort = verilogWorkspace.getModuleFromInstance(wireStartModuleInstanceId).getPort(wireStartPortIndex);

            } else {

                selectedModuleInstanceId = hoveredModuleInstanceId;

                handleModuleInstanceSelected();

            }


        } else {

            creatingModule = true;

        }


    }

    function handleMouseUp(evt) {
        updateMousePos(evt);
        mouseDown = false;

        if (creatingModule) {

            var x = Math.min(dragStartPos.x, mousePos.x);
            var y = Math.min(dragStartPos.y, mousePos.y);

            var width = Math.abs(mousePos.x - dragStartPos.x);
            var height = Math.abs(mousePos.y - dragStartPos.y);

            if (height > 50 && width > 50) {

                handleModuleInstanceAdded(x, y, width, height);

            }

        }

        if (creatingWire && hoveredModuleInstanceId != -1 && hoveredPortIndex != -1) {

            handleWireConnected(wireStartModuleInstanceId, wireStartPortIndex, hoveredModuleInstanceId, hoveredPortIndex);

        }

        movingModule = false;
        creatingModule = false;
        creatingWire = false;

    }

    // end mouse handlers ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------


    function handleShortcutKey(event) {

        // do nothing if user is using input
        if (this !== event.target && (/textarea|select/i.test(event.target.nodeName) || event.target.type === "text")) {
            return;
        }

        if (selectedModuleInstanceId != -1 && (event.code == "Backspace" || event.code == "Delete")) {

            handleModuleInstanceDeleted(selectedModuleInstanceId);

        } else {
            return;
        }

        event.preventDefault();

    }

    // start update hovered/selected object methods --------------------------------------------------------------------------------------------------------------------------------------------------------

    function updateHoveredModule() {

        hoveredModuleInstanceId = -1;

        for (var id of verilogWorkspace.moduleInstanceIds()) {

            var moduleInstance = verilogWorkspace.getModuleInstance(id);

            if (inModuleBounds(mousePos, moduleInstance)) {

                hoveredModuleInstanceId = id;

            }

        }

    }

    function updateHoveredPort() {

        hoveredPortIndex = -1;

        if (hoveredModuleInstanceId == -1) return;

        var moduleInstance = verilogWorkspace.getModuleInstance(hoveredModuleInstanceId);
        var module = verilogWorkspace.getModuleFromInstance(hoveredModuleInstanceId);

        var yoff = 0;

        for (var i = 0; i < module.portCount(); i++) {

            var port = module.getPort(i);

            var portX = port.input ? moduleInstance.position.x : moduleInstance.position.x + moduleInstance.position.width - portWidth;
            var portY = moduleInstance.position.y + yoff;

            if (inBounds(mousePos, { x: portX, y: portY }, portWidth, portHeight)) {
                hoveredPortIndex = i;
            }

            yoff += portHeight;

        }

    }

    function updateHoveredWire() {

        hoveredWireId = -1;

        if (hoveredPortIndex != -1) return;

        var detectRange = 10;

        var minDist = detectRange;

        for (var id of verilogWorkspace.wireIds()) {

            var wire = verilogWorkspace.getWire(id);

            var startPoint = getPortPosition(wire.startModuleInstanceId, wire.startPortIndex);
            var endPoint = getPortPosition(wire.endModuleInstanceId, wire.endPortIndex);

            var dist = distanceToSegment(mousePos, startPoint, endPoint);

            if (dist < minDist) {
                minDist = dist;
                hoveredWireId = id;
            }

        }

    }

    function updateSelection() {

        if (!movingModule) {

            updateHoveredModule();

            updateHoveredPort();

            updateHoveredWire();

            if (hoveredWireId != -1) {
                hoveredModuleInstanceId = -1;
            }

        }

        if (creatingModule) {
            hoveredModuleInstanceId = -1;
            hoveredPortIndex = -1;
        }

    }

    // end update hovered/selected object methods ----------------------------------------------------------------------------------------------------------------------------------------------------------

    

    function handlePortsAdded() {

        if (selectedModuleInstanceId == -1) {

            alert("Please select a module to add a port to.");

            return;
        }

        var module = verilogWorkspace.getModuleFromInstance(selectedModuleInstanceId);

        var portType = document.querySelector('input[name="portType"]:checked').value;

        var input = portType == "input";

        var size = parseInt(portSizeTextArea.value);

        var names = portNameTextArea.value.trim().split(/\s*[\s,]\s*/);

        if (names.length == 0) {

            alert("Please specify a valid name for the port.");

            return;

        }

        if (portSizeTextArea.value.trim() == "") size = 1;

        if (isNaN(size)) {

            alert("Please specify a valid bit width or leave the field blank for a 1-bit port.");

            return;

        }

        for (var i = 0; i < names.length; i++) {

            var name = names[i].trim();

            if (name == "") continue;

            module.addPort(name, size, input);

        }



        portNameTextArea.value = "";
        portSizeTextArea.value = "";


    }

    function handlePortsCleared() {

        if (selectedModuleInstanceId == -1) return;

        var moduleInstance = verilogWorkspace.getModuleInstance(selectedModuleInstanceId);
        var module = verilogWorkspace.getModule(moduleInstance.getModuleId());

        verilogWorkspace.removeWires(moduleInstance.getModuleId(), -1, -1);

        module.clearPorts();

    }

    function handleModuleInstanceSelected() {

        var moduleInstance = verilogWorkspace.getModuleInstance(selectedModuleInstanceId);

        var module = verilogWorkspace.getModuleFromInstance(selectedModuleInstanceId);

        moduleNameTextArea.value = module.name;

        moveStartPos = {
            x: moduleInstance.position.x, y: moduleInstance.position.y
        }

        movingModule = true;

    }

    function handleWireConnected(startModuleInstanceId, startPort, endModuleInstanceId, endPort) {

        var startModuleInstance = verilogWorkspace.getModuleInstance(startModuleInstanceId);
        var endModuleInstance = verilogWorkspace.getModuleInstance(endModuleInstanceId);

        var startModule = verilogWorkspace.getModuleFromInstance(startModuleInstanceId);
        var endModule = verilogWorkspace.getModuleFromInstance(endModuleInstanceId);

        var port1 = startModule.getPort(startPort);
        var port2 = endModule.getPort(endPort);

        if (!Port.checkPortCompatible(port1, port2)) {
            alert("The port you are trying to connect to is not compatible with the wire you have selected.");
            return;
        }

        var wire = new Wire(startModuleInstanceId, startModuleInstance.getModuleId(), startPort, endModuleInstanceId, endModuleInstance.getModuleId(), endPort, port1.size);

        verilogWorkspace.addWire(wire);

    }



    function handleModuleInstanceDeleted(id) {

        verilogWorkspace.removeModuleInstance(id);

        moduleNameTextArea.value = "";

        selectedModuleInstanceId = -1;

        updateSelection();

        verilogWorkspace.removeWires(id, -1);

    }

    function handleModuleInstanceAdded(x, y, width, height) {

        var module = new Module();

        module.setName("adder_16");

        module.addPort("a", 16, true);
        module.addPort("b", 16, true);
        module.addPort("cin", 1, true);
        module.addPort("sum", 16, false);
        module.addPort("cout", 1, false);

        var id = verilogWorkspace.addModule(module);

        var instance = new ModuleInstance(id);

        instance.position.setX(x);
        instance.position.setY(y);
        instance.position.setWidth(width);
        instance.position.setHeight(height);

        verilogWorkspace.addModuleInstance(instance);

    }

    function inModuleBounds(point, module) {
        return inBounds(point, { x: module.position.x, y: module.position.y }, module.position.width, module.position.height);
    }

    function getPortPosition(moduleInstanceId, portIndex) {

        var moduleInstance = verilogWorkspace.getModuleInstance(moduleInstanceId);
        var module = verilogWorkspace.getModuleFromInstance(moduleInstanceId);
        var port = module.getPort(portIndex);

        var portY = moduleInstance.position.y + portIndex * portHeight + portHeight / 2;
        var portX = port.input ? moduleInstance.position.x + portWidth / 2 : moduleInstance.position.x + moduleInstance.position.width - portWidth / 2;

        return { x: portX, y: portY };

    }


    // start draw methods ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

    function drawModuleInstances() {

        for (var id of verilogWorkspace.moduleInstanceIds()) {

            drawModuleInstance(id);

        }

    }

    function drawModuleInstance(moduleInstanceId) {

        var moduleInstance = verilogWorkspace.getModuleInstance(moduleInstanceId);
        var module = verilogWorkspace.getModuleFromInstance(moduleInstanceId);

        ctx.lineWidth = 4;
        ctx.lineCap = "butt";
        ctx.fillStyle = "#bafdff";
        ctx.strokeStyle = "#000000";

        if (hoveredModuleInstanceId == moduleInstanceId && hoveredPortIndex == -1) {
            ctx.lineWidth = 8;
            //ctx.strokeStyle = "#0000df";
        }

        if (selectedModuleInstanceId == moduleInstanceId) {
            ctx.fillStyle = "#caffbd";
        }

        ctx.strokeRect(moduleInstance.position.x, moduleInstance.position.y, moduleInstance.position.width, moduleInstance.position.height);
        ctx.fillRect(moduleInstance.position.x, moduleInstance.position.y, moduleInstance.position.width, moduleInstance.position.height);


        var yoff = 0;

        ctx.lineWidth = 2;

        for (var i = 0; i < module.portCount(); i++) {

            var port = module.getPort(i);

            var hoveringPort = hoveredModuleInstanceId == moduleInstanceId && hoveredPortIndex == i;
            var portCompatible = creatingWire && Port.checkPortCompatible(wireStartPort, port);

            var portX = port.input ? moduleInstance.position.x + portWidth / 2 : moduleInstance.position.x + moduleInstance.position.width - portWidth / 2;
            var portY = moduleInstance.position.y + yoff + portHeight / 2;

            // draw the port
            drawPort(portX, portY, creatingWire, hoveringPort, portCompatible);

            ctx.fillStyle = "#000000";
            ctx.font = "bold 12px arial";
            ctx.textBaseline = 'middle';
            //ctx.textAlign = 'center';

            var text = `${port.name} ${port.size > 1 ? "[" + (port.size - 1) + ":0]" : ""}`;

            var moduleNameWidth = ctx.measureText(text).width;

            var moduleNameHeight = parseInt(ctx.font.match(/\d+/), 10);

            var textStart = port.input ? moduleInstance.position.x + portWidth : moduleInstance.position.x + moduleInstance.position.width - portWidth - moduleNameWidth;

            ctx.fillText(text, textStart, moduleInstance.position.y + yoff + portHeight / 2);

            yoff += portHeight;


        }


        // draw module name

        ctx.font = "bold italic 18px arial";
        ctx.textBaseline = 'middle';
        ctx.fillStyle = "#000000";

        var moduleNameText = module.name;

        var nameDims = textDimensions(moduleNameText, ctx);

        var moduleNameY = Math.max(moduleInstance.position.y + yoff + nameDims.height, moduleInstance.position.y + moduleInstance.position.height / 2);

        ctx.fillText(moduleNameText, moduleInstance.position.x + moduleInstance.position.width / 2 - nameDims.width / 2, moduleNameY);




        // draw instance name

        ctx.font = "14px arial";
        ctx.textBaseline = 'middle';
        ctx.fillStyle = "#000000";

        var instanceNameText = moduleInstance.name;

        var instNameDims = textDimensions(instanceNameText, ctx);

        var instNameY = moduleNameY + instNameDims.height + 10;

        ctx.fillText(instanceNameText, moduleInstance.position.x + moduleInstance.position.width / 2 - instNameDims.width / 2, instNameY);


    }

    function drawPort(x, y, creating, hovering, compatible) {

        // port draw defaults

        ctx.lineWidth = 2;
        var radius = 5;
        ctx.strokeStyle = "#000000";
        ctx.fillStyle = "#ffffff";

        if (creating) {

            if (compatible) {

                // make the circle larger
                radius = 7;
                ctx.lineWidth = 4;

                if (hovering) {

                    // make the circle blue
                    ctx.strokeStyle = "#0040ff";

                }

                // draw the circle
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke();

            } else {

                if (hovering) {

                    // draw a red x
                    radius = 7;
                    ctx.strokeStyle = "#ff4f4f";
                    ctx.lineWidth = 4;

                    ctx.beginPath();
                    ctx.moveTo(x - radius, y - radius);
                    ctx.lineTo(x + radius, y + radius);
                    ctx.moveTo(x + radius, y - radius);
                    ctx.lineTo(x - radius, y + radius);
                    ctx.stroke();

                } else {

                    // draw the circle
                    ctx.beginPath();
                    ctx.arc(x, y, radius, 0, 2 * Math.PI);
                    ctx.fill();
                    ctx.stroke();

                }



            }

        } else {

            if (hovering) {

                // make the circle larger
                radius = 7;
                ctx.lineWidth = 4;

            }

            ctx.beginPath();
            ctx.arc(x, y, radius, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();

        }

    }

    function drawWire(x1, y1, x2, y2, id) {

        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.strokeStyle = "#000000";

        if (id != -1 && hoveredWireId == id) {
            //ctx.strokeStyle = "#ff0000";
            ctx.lineWidth = 5;
        }

        var xProp = Math.abs(y2 - y1) / 100;
        var midX = x1 + xProp * (x2 - x1);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        //ctx.lineTo(midX, y1);
        //ctx.lineTo(midX, y2);
        ctx.lineTo(x2, y2);
        ctx.stroke();

    }

    function drawWires() {

        for (var id of verilogWorkspace.wireIds()) {

            var wire = verilogWorkspace.getWire(id);

            var startPos = getPortPosition(wire.startModuleInstanceId, wire.startPortIndex);
            var endPos = getPortPosition(wire.endModuleInstanceId, wire.endPortIndex);

            drawWire(startPos.x, startPos.y, endPos.x, endPos.y, id);

        }


    }




    function drawAll() {

        ctx.fillStyle = "#ffffff";

        ctx.fillRect(0, 0, canvas.width, canvas.height);

        drawModuleInstances();

        drawWires();

        if (movingModule) {

            var moduleInstance = verilogWorkspace.getModuleInstance(hoveredModuleInstanceId);

            var dx = mousePos.x - dragStartPos.x;
            var dy = mousePos.y - dragStartPos.y;

            moduleInstance.position.x = moveStartPos.x + dx;
            moduleInstance.position.y = moveStartPos.y + dy;

        }

        if (creatingModule) {

            ctx.lineWidth = 2;
            ctx.lineCap = "butt";


            ctx.fillStyle = "#ffffff";
            ctx.strokeRect(dragStartPos.x, dragStartPos.y, mousePos.x - dragStartPos.x, mousePos.y - dragStartPos.y);
            ctx.fillRect(dragStartPos.x, dragStartPos.y, mousePos.x - dragStartPos.x, mousePos.y - dragStartPos.y);

        }

        if (creatingWire) {

            if (hoveredPortIndex != -1) {

                var wirePortPos = getPortPosition(hoveredModuleInstanceId, hoveredPortIndex);

                drawWire(wireStartPos.x, wireStartPos.y, wirePortPos.x, wirePortPos.y, -1);

            } else {

                drawWire(wireStartPos.x, wireStartPos.y, mousePos.x, mousePos.y, -1);

            }



        }


    }

    // end draw methods --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------






}

