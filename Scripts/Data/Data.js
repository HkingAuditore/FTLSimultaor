/// <reference path="Block.js" />
/// <reference path="../FTL/SSD.js" />
/* #region  自动生成数据名 */
//盘符生成器
function* DataNameGenerator() {
    let index = 0;
    while (true) yield String.fromCharCode("A".charCodeAt() + index++);
}
var dataNameGenerator = DataNameGenerator();

function DefaultDataName() {
    return dataNameGenerator.next().value;
}
class Data {
    // Unicode字符长度
    static CHAR_SIZE = 16;
    // Data使用的Block
    blocks;
    // Data存储于的SSD
    ssd;
    // Data的名称
    name;

    constructor(content, name = DefaultDataName(), ssd = undefined) {
        let bls = [];
        // 将存储内容二进制化
        let contentStr = Data.StrToBinary(content);
        // 将内容分别存储到多个block
        while (contentStr.length > 0) {
            bls.push(new Block(contentStr.substring(0, Block.BUFFER_SIZE)));
            contentStr = contentStr.substring(Block.BUFFER_SIZE);
        }

        this.blocks = bls;
        for (let blk of this.blocks) {
            blk.data = this;
        }

        this.name = name;

        if (ssd !== undefined) {
            this.ssd = ssd;
            let blks = ssd.WriteData(this);
            blks = null;
        }
    }

    //读取Block内数据
    Read() {
        let content = "";
        this.blocks.forEach((element) => {
            content += element.Read();
        });
        return Data.BinaryToStr(content);
    }

    //读取包括DataLog的数据
    ReadIncludeLog() {
        let pages = [];
        this.blocks.forEach((element) => {
            element.pages.forEach((page) => {
                pages.push(page);
            });
        });

        for (let p in pages) {
            let result = this.ssd.DataLogFind(pages[p].num);

            if (result !== undefined) {
                pages[p] = result;
            }
        }
        // console.log(pages);
        let content = "";
        pages.forEach((element) => {
            if (parseInt(element.Read(), 2) != 0) {
                content += element.Read();
            }
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
                    this.blocks.push(this.ssd.WriteBlock(new Block(tmpContent, 0, this)));
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

    // 有缓冲区的修改
    EditHybrid(content) {
        // 将存储内容二进制化
        let contentStr = Data.StrToBinary(content);
        // 将内容分别存储到多个block
        let i = 0;
        while (contentStr.length > 0) {
            let tmpContent = contentStr.substring(0, Block.BUFFER_SIZE);
            tmpContent = tmpContent.padStart(Block.BUFFER_SIZE, "0");

            if (i < this.blocks.length) {
                // 修改内容在原有Blocks范围内
                // 找不同点
                let difference = Block.CompareInPages(tmpContent, this.blocks[i].ReadBlockPagesWithLog());
                // let existedEdit = this.blocks[i].FindExistedEdit(this.ssd);
                if (difference.length > 0) {
                    //混合级别映射
                    // console.log("**********");
                    for (let target of difference) {
                        let editContent = tmpContent.substring(
                            target * Page.PAGE_SIZE,
                            target * Page.PAGE_SIZE + Page.PAGE_SIZE
                        );

                        this.ssd.UpdateLog(editContent, this.blocks[i].pages[target]);
                    }
                }
            } else {
                try {
                    // 修改内容在原有Blocks范围外
                    this.blocks.push(this.ssd.WriteBlock(new Block(tmpContent, 0, this)));
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
            throw new Error("Transfer方法需要Data已有宿主！");
        }
        let originBlocks = ssd.WriteData(this);
        for (let blk of originBlocks) {
            originSSD.Free(blk);
        }
    }

    ChangeBlock(origin, target) {
        let index = this.blocks.indexOf(origin);
        target.data = this;
        this.blocks[index] = target;
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