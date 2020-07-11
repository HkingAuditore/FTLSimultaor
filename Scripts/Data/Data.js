/// <reference path="Block.js" />
/// <reference path="../FTL/SSD.js" />
class Data {
    static CHAR_SIZE = 16;
    blocks;

    constructor(content, ssd) {
        let bls = [];
        // 将存储内容二进制化
        let contentStr = Data.StrToBinary(content);
        // 将内容分别存储到多个block
        while (contentStr.length > 0) {
            bls.push(new Block(contentStr.substring(0, Block.BUFFER_SIZE)));
            contentStr = contentStr.substring(Block.BUFFER_SIZE);
        }

        // 向SSD中的块写入数据
        let savedBls = [];
        for (let i = 0; i < bls.length; i++) {
            try {
                savedBls.push(ssd.WriteData(bls[i]));
            } catch (e) {
                console.log(e.message);
                break;
            }
        }
        bls = null;
        this.blocks = savedBls;
    }

    Read() {
        let content = "";
        this.blocks.forEach((element) => {
            content += element.Read();
        });
        return Data.BinaryToStr(content);
    }

    // 字符串转二进制
    static StrToBinary(content) {
        let contentStr = String(content);
        let binaryStr = "";
        for (let i = 0; i < contentStr.length; i++) {
            let tmpSection = contentStr[i].charCodeAt().toString(2);
            if (tmpSection.length < Data.CHAR_SIZE) {
                tmpSection = tmpSection.padStart(Data.CHAR_SIZE, "0");
            }
            binaryStr += tmpSection;
        }
        return binaryStr;
    }

    // 解读二进制内容
    static BinaryToStr(content) {
        let result = "";
        let tmpContent = String(Data.TrimBinary(content));
        while (tmpContent.length >= Data.CHAR_SIZE) {
            let tmp = String.fromCharCode(
                parseInt(tmpContent.substring(0, Data.CHAR_SIZE), 2)
            );
            tmpContent = tmpContent.substring(Data.CHAR_SIZE);
            result += tmp;
        }
        return result;
    }

    // 删除占位符
    static TrimBinary(content) {
        let tmpContent = String(content);
        while (tmpContent.length >= Data.CHAR_SIZE) {
            let tmp = parseInt(tmpContent.substring(0, Data.CHAR_SIZE), 2);
            if (tmp == 0) {
                tmpContent = tmpContent.substring(Data.CHAR_SIZE);
                continue;
            } else {
                return tmpContent;
            }
        }
    }
}