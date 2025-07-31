## inbox
把表格的json导出作为specs文件，用于定义接口规范

## completed

1. bookupload接口
    1. 拉取epub列表的接口
    2. gethealth接口
    3. 通过epuburl解析epub并且更新books数据库的接口
2. github action CI/CD
    1. 配置github上的环境变量
    2. 配置github actions workflows 自动部署docker容器
    3. 触发cicd需要先设置安全组
    4. 服务器开启代理，不然拉不了 github容器服务中构建好的容器
    5. 后面可以转成阿里云容器镜像服务ACR
    