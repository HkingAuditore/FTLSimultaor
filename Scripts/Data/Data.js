/// <reference path="Block.js" />
/// <reference path="../FTL/SSD.js" />
class Data {
    static CHAR_SIZE = 16;
    blocks;
    ssd;
    name;

    constructor(content, name = "untitled", ssd = undefined) {
        let bls = [];
        // 将存储内容二进制化
        let contentStr = Data.StrToBinary(content);
        // 将内容分别存储到多个block
        while (contentStr.length > 0) {
            bls.push(new Block(contentStr.substring(0, Block.BUFFER_SIZE)));
            contentStr = contentStr.substring(Block.BUFFER_SIZE);
        }

        this.blocks = bls;
        this.name = name;

        if (ssd !== undefined) {
            this.ssd = ssd;
            let blks = ssd.WriteData(this);
            blks = null;
        }

    }

    Read() {
        let content = "";
        this.blocks.forEach((element) => {
            content += element.Read();
        });
        return Data.BinaryToStr(content);
    }

    // 修改数据
    Edit(content) {
        // 将存储内容二进制化
        let contentStr = Data.StrToBinary(content);
        // 将内容分别存储到多个block
        let i = 0;
        while (contentStr.length > 0) {
            let tmpContent = contentStr.substring(0, Block.BUFFER_SIZE);

            if (i < this.blocks.length) {
                // 修改内容在原有Blocks范围内
                if (!this.blocks[i].Compare(tmpContent)) {
                    this.blocks[i] = this.ssd.OutOfUpdate(tmpContent, this.blocks[i]);
                }
            } else {
                try {
                    // 修改内容在原有Blocks范围外
                    this.blocks.push(this.ssd.WriteBlock(new Block(tmpContent)));
                } catch (e) {
                    console.log(e.message);
                    break;
                }
            }
            i++;
            contentStr = contentStr.substring(Block.BUFFER_SIZE);
        }
        // 将contentStr更新完后还剩下空余Block
        if (i < this.blocks.length) {
            while (i < this.blocks.length) {
                this.ssd.Free(this.blocks[i]);
                this.blocks.splice(i, 1);
            }
        }
    }

    // 修改数据名
    EditName(name) {
        this.name = name;
    }

    //移动数据到另一个SSD
    Transfer(ssd) {
        let originSSD = this.ssd;
        if (originSSD === undefined) {
            throw new Error("Transfer方法需要Data已有宿主！")
        }
        let originBlocks = ssd.WriteData(this);
        for (let blk of originBlocks) {
            originSSD.Free(blk);
        }
    }

    //复制数据到另一个SSD
    Copy(ssd) {
        return new Data(this.Read(), this.name, ssd);
    }

    Delete() {
        this.ssd.DeleteData(this);
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