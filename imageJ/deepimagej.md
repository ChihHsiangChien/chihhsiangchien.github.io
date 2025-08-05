# DeepImagej

[官方網站](https://deepimagej.github.io)

## 在fiji安裝
1. 到`Help > Update...`安裝`DeepImageJ`
2. 執行` Plugins › DeepImageJ › DeepImageJ Cellpose`

安裝後還需要兩步處理

1. 第一次使用時，會先要求你接受安裝python，按下允許後重新再啟動。

2. 但安裝python後第一次執行可能出現error，這問題可能來自共享記憶體的實作有問題。需要手動換掉 Fiji 中的 JNA 函式庫，作法如下
    1. 到官方 JNA GitHub：[https://github.com/java-native-access/jna](https://github.com/java-native-access/jna)下載 JNA 最新 release（建議用 5.12.1 或以上）找到最新版本的`jna.jar`和`jna-platform.jar`
    2. 把它們放進： `Fiji.app/jars/`，若該資料夾已有舊版 jna.jar，請先備份並移除(如果你安裝過ffmpeg，會安裝舊版的，請記得保留)。

## 使用已訓練的模型
安裝後預設可以使用cellpose和stardist兩類推論模型，除此之外還可以在[bioimage.io](https://bioimage.io/#/models)下載模型使用。

執行` Plugins › DeepImageJ › DeepImageJ StarDist`或` Plugins › DeepImageJ › DeepImageJ cellpose`之後，選擇使用哪種模型之後，會再自動下載模型檔後才能使用。



