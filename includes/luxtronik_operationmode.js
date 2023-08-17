
class LuxtronikOperationMode {
    constructor() {
        this.value = null;
    }

    setOperationMode(modeAsInt) {
        switch (modeAsInt) {
            case 0:
                this.value = "Heating";
                break;
            case 1:
                this.value = "Hot Water";
                break;
            case 2:
                this.value = "Swimming Pool/Solar";
                break;
            case 3:
                this.value = "EVU";
                break;
            case 4:
                this.value = "Defrost";
                break;
            case 5:
                this.value = "No Request";
                break;
            case 6:
                this.value = "Heating External";
                break;
            case 7:
                this.value = "Cooling";
                break;
        }
    }

    getOperationMode() {
        return this.value;
    }
}

module.exports = LuxtronikOperationMode;