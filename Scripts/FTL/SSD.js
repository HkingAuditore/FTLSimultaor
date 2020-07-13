/// <reference path="../Data/Block.js" />
/// <reference path="../Data/Page.js" />
/// <reference path="../Data/Data.js" />

/* #region  自动生成盘符 */
//盘符生成器
function* SsdNameGenerator() {
    let index = 0;
    while (true) yield String.fromCharCode("A".charCodeAt() + index++);
}
var ssdNameGenerator = SsdNameGenerator();

function DefaultSSDName() {
    return ssdNameGenerator.next().value;
}

/* #endregion */

class SSD {
    // 硬盘可用内区块，暂且优先使用顶层
    freeBlocks;

    // 已使用区块
    usedBlocks;

    // SSD名称
    name;

    // Block表
    blocksTable;

    // Page表
    pagesTable;

    //缓冲区DataLog
    dataLog;
    //缓冲区当前使用Block标记
    dataLogCur;

    //冷热数据滤波器指示数组
    coldHotIndicator;

    // 编号长度
    static NUM_SIZE = 4;

    constructor(count, name = DefaultSSDName(), size = 16) {
        this.freeBlocks = new Array(count);
        this.usedBlocks = [];
        let pgIndex = 0;
        let blIndex = 0;
        for (let i = 0; i < this.freeBlocks.length; i++) {
            this.freeBlocks[i] = new Block(
                "",
                String(blIndex++).padStart(SSD.NUM_SIZE, "0")
            );
            this.freeBlocks[i].ssd = this;
            this.freeBlocks[i].pages.forEach((element) => {
                element.num = String(pgIndex++).padStart(SSD.NUM_SIZE, "0");
            });
        }
        this.datum = [];
        this.name = name;
        this.coldHotIndicator = new Array(count / 4).fill(0);

        //建表
        this.blocksTable = new Map();
        for (let block of this.freeBlocks) {
            this.blocksTable.set(block.num, block);
        }

        this.pagesTable = new Map();
        for (let block of this.freeBlocks) {
            block.pages.forEach((element) => {
                this.pagesTable.set(element.num, element);
            });
        }

        this.GenerateDataLog(size);
    }

    // 初始化DataLog
    GenerateDataLog(size) {
        this.dataLog = [];
        for (let i = 0; i < size; i++) {
            let blk = this.freeBlocks.shift();
            this.dataLog.push(blk);
        }
    }

    /* #region  数据读写 */
    //向SSD中的空闲区块写入数据
    WriteBlock(block) {
        if (this.freeBlocks.length > 0) {
            Block.Clone(block, this.freeBlocks[0]);
            block.pages = null;
            let blk = this.freeBlocks.shift();
            this.usedBlocks.push(blk);
            this.BloomFilterSetter(blk.num);
            return blk;
        } else {
            throw new Error("没有可用区块！");
        }
    }

    WriteData(data) {
        // 向SSD中的块写入数据
        let savedBls = [];
        this.datum.push(data);
        for (let i = 0; i < data.blocks.length; i++) {
            try {
                savedBls.push(this.WriteBlock(data.blocks[i]));
            } catch (e) {
                console.log(e.message);
                break;
            }
        }
        data.ssd = this;
        origin = data.blocks;
        data.blocks = savedBls;
        return origin;
    }

    DeleteData(data) {
        if (data.ssd != this) throw new Error("这个Data不在此SSD！");
        for (let block of data.blocks) {
            this.Free(block);
        }
        this.datum.splice(this.datum.indexOf(data), 1);
        data.ssd = undefined;
        data.blocks = null;
        data = null;
    }

    /* #endregion */

    // 释放区块
    Free(block) {
        let target = jQuery.inArray(block, this.usedBlocks);
        if (target != -1) {
            // 注释下行表明Free操作不对Block进行擦除
            // this.usedBlocks[target].Clean();
            this.usedBlocks[target].data = undefined;
            this.freeBlocks.push(this.usedBlocks[target]);
            this.usedBlocks.splice(target, 1);
            this.BloomFilterSetter(target.num);

        } else {
            throw new Error("找不到此Block！");
        }
    }

    //异处更新
    OutOfUpdate(content, oldBlock) {
        let newBlock = this.WriteBlock(new Block(content));
        this.Free(oldBlock);
        return newBlock;
    }

    //Page ID 二进制生成
    static PageIdToBinary(num) {
        let numStr = String(num);
        let binaryStr = "";
        for (let i = 0; i < numStr.length; i++) {
            let tmpSection = (numStr[i].charCodeAt() - "0".charCodeAt()).toString(2);
            tmpSection = tmpSection.padStart(4, "0");
            binaryStr += tmpSection;
        }
        return binaryStr;
    }

    //Page ID 二进制还原
    static BinaryToPageId(binaryStr) {
        let binary = String(binaryStr);
        let result = "";
        while (binary.length >= 4) {
            let tmp = parseInt(binary.substring(0, 4), 2);
            binary = binary.substring(4);
            result += tmp;
        }
        return result;
    }

    //写DataLog
    UpdateLog(content, oldPage) {
        for (let block in this.dataLog) {
            for (let i = 0; i < this.dataLog[block].pages.length; i += 2) {
                if (
                    SSD.BinaryToPageId(this.dataLog[block].pages[i].content) == "0000"
                ) {
                    this.dataLog[block].pages[i].Write(SSD.PageIdToBinary(oldPage.num));
                    this.dataLog[block].pages[i + 1].Write(content);
                    this.dataLogCur = block;
                    return i;
                }
            }
        }
        throw new Error("找不到DataLog空间！");
    }

    //查找DataLog中修改的数据,返回最近的修改Page
    DataLogFind(num) {
        let result;
        for (let block in this.dataLog) {
            for (let i = 0; i < this.dataLog[block].pages.length; i += 2) {
                if (this.dataLog[block].pages[i].content == SSD.PageIdToBinary(num)) {
                    result = this.dataLog[block].pages[i + 1];
                } else if (parseInt(this.dataLog[block].pages[i].content, 2) === 0) {
                    return result;
                }
            }
        }
        return result;
    }

    /* #region  垃圾回收 */
    FreeLog() {
        this.dataLog.forEach((element) => {
            element.pages.forEach((page) => {
                page.Write("".padStart(Page.PAGE_SIZE, "0"));
            });
        });
        this.dataLogCur = 0;
    }

    // 完全合并
    FullMerge() {
            let usedBlks = [];
            // 创建usedblock的副本，不能使用引用！
            this.usedBlocks.forEach((element) => {
                usedBlks.push(element);
            });

            //逐usedblock操作
            for (let i = 0; i < usedBlks.length; i++) {
                let existed = usedBlks[i].FindExistedEdit();
                // 如果这个block有对应的修改log，就新申请一个block进行合并操作
                if (existed.size > 0) {
                    let tmp = new Block("");
                    let pages = usedBlks[i].ReadBlockPagesWithLog();

                    // 数据转移
                    for (let page in pages) {
                        Page.Clone(pages[page], tmp.pages[page]);
                    }
                    let blk = this.WriteBlock(tmp);
                    usedBlks[i].data.ChangeBlock(usedBlks[i], blk);

                    // 旧block释放
                    this.Free(usedBlks[i]);
                }
            }
            this.FreeLog();
        }
        /* #endregion */

    /* #region   地址映射*/

    // 根据data名称查找data
    FindData(name) {
        return this.datum.find((d) => d.name == name);
    }

    // 根据page编号查找page
    FindPage(num) {
        return this.pagesTable.get(String(num).padStart(SSD.NUM_SIZE, "0"));
    }

    // 根据block编号查找block
    FindBlock(num) {
        return this.blocksTable.get(String(num).padStart(SSD.NUM_SIZE, "0"));
    }

    /* #endregion */

    /* #region  布隆滤波器 */

    BloomHashA(num) {
        let arr = String(num).padStart(SSD.NUM_SIZE, "0").split('');
        let result = 0;
        arr.forEach((element) => {
            result += Math.floor((Number(element) * Number(element) * Number(element)) * 3.17159);
        });
        return result % this.coldHotIndicator.length;
    }
    BloomHashB(num) {
        return num % this.coldHotIndicator.length;
    }

    BloomHashC(num) {
        let arr = String(num).padStart(SSD.NUM_SIZE, "0").split('');
        arr = arr.reverse();
        let result = 0;
        for (let i = 0; i < arr.length; i++) {
            result += Number(arr[i]) * Number(arr[i]);
        }
        return Math.floor(result * 3.14) % this.coldHotIndicator.length;
    }

    BloomFilterGetter(num) {
        return (
            this.coldHotIndicator[this.BloomHashA(num)] +
            this.coldHotIndicator[this.BloomHashB(num)] +
            this.coldHotIndicator[this.BloomHashC(num)]
        );
    }

    BloomFilterSetter(num) {
            this.coldHotIndicator[this.BloomHashA(num)]++;
            this.coldHotIndicator[this.BloomHashB(num)]++;
            this.coldHotIndicator[this.BloomHashC(num)]++;
        }
        /* #endregion */
}