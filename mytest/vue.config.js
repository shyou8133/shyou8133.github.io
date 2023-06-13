var path = require('path')
var webpack = require('webpack')
// 文件压缩
const CompressionPlugin = require('compression-webpack-plugin');
const productionGzipExtensions = /\.(js|css|json|txt|html|ico|svg)(\?.*)?$/i;
// 代码压缩
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')
// 引入css - rem的配置
// const px2rem = require('postcss-px2rem')
// const postcss = px2rem({
// 	remUnit: 16   //基准大小 baseSize，需要和rem.js中相同
// })
function resolve (dir) {
  return path.join(__dirname, dir)
}
module.exports = {
  publicPath: "./", // 打包的输出路径
  // 假设部署路径再 https://www.my-app.com/xzl/ 因此需要设置：publicPath: "/xzl"
  outputDir: "dist", // 打包后的文件 默认为dist -> 若是项目名称为xzl 那么配合之 修改为xzl
  productionSourceMap: true, // 生产环境是否生成 sourceMap 文件

  // 配置别名
  chainWebpack: config => {
    config.resolve.alias
        .set('@', resolve('src'))
        .set('@com', resolve('src/components'))
        .set('@ass', resolve('src/assets'));
    if (process.env.NODE_ENV === 'production') {
      config.plugin('compressionPlugin')
          .use(new CompressionPlugin({
            filename: '[path].gz[query]',
            algorithm: 'gzip', // 使用gzip压缩
            test: productionGzipExtensions, // 匹配文件名
            threshold: 10240, // 对超过10k的数据压缩
            minRatio: 0.8, // 压缩率小于0.8才会压缩
            deleteOriginalAssets: true // 是否删除未压缩的源文件，谨慎设置，如果希望提供非gzip的资源，可不设置或者设置为false（比如删除打包后的gz后还可以加载到原始资源文件）
          }));
    }
    // 图片压缩
    config.module
        .rule('images')
        .exclude.add(resolve('src/assets/icons')) // 排除icons目录，这些图标已用 svg-sprite-loader 处理，打包成 svg-sprite 了
        .end()
        .use('url-loader')
        .tap(options => ({
          limit: 10240, // 稍微改大了点
          fallback: {
            loader: require.resolve('file-loader'),
            options: {
              // 在这里修改file-loader的配置
              // 直接把outputPath的目录加上，虽然语义没分开清晰但比较简洁
              name: 'static/img/[name].[hash:8].[ext]',
              esModule: false, //低版本默认为false，高版本默认为true 这里为6.2.0为高本版本所以要手动设置为false
            }
          }
        }))
        .end()
        .use('image-webpack-loader')
        .loader('image-webpack-loader')
        .options({
          mozjpeg: { progressive: true, quality: 50 }, // 压缩JPEG图像
          optipng: { enabled: true }, // 压缩PNG图像
          pngquant: { quality: [0.5, 0.65], speed: 4 }, // 压缩PNG图像
          gifsicle: { interlaced: false } // 压缩GIF图像
        })
        .end()
        .enforce('post');// 表示先执行配置在下面那个loader，即image-webpack-loader
    // 	// 添加可视化工具 - 查看打包后的文件大小！
    // 	if (process.env.NODE_ENV === 'production') {
    // 	if (process.env.npm_config_report) {
    // 		config
    // 			.plugin('webpack-bundle-analyzer')
    // 			.use(require('webpack-bundle-analyzer').BundleAnalyzerPlugin)
    // 			.end();
    // 		config.plugins.delete('prefetch')
    // 	}
    // }
  },

  // css相关配置
  css: {
    extract: false, // 是否使用css分离插件 ExtractTextPlugin 简单来说就是为true时，打包会把css单独分文件出来打包，否则直接注入js之中打包
    // sourceMap: true, // 开启 CSS source maps?

    // 默认情况下，只有 *.module.[ext] 结尾的文件才会被视作 CSS Modules 模块。设置为 false 后你就可以去掉文件名中的 .module 并将所有的 *.(css|scss|sass|less|styl(us)?) 文件视为 CSS Modules 模块(requireModuleExtension: false与loaderOptions配合使用会失效，因此要为true )
    // 因为要配置了loaderOptions.css, 尽管requireModuleExtension的值为默认值，我们也需要指出
    requireModuleExtension: true,
    loaderOptions: {
      css: {
        modules: {
          // 定义模块化类名 hash值模式
          localIdentName: '[local]_[hash:base64:8]'
        }
      }
    }
  },

  configureWebpack: {
    plugins: [
      new webpack.ProvidePlugin({
        $: 'jquery',
        jquery: 'jquery',
        'window.jQuery': 'jquery',
        jQuery: 'jquery'
      }),
    ],
    // 优化
    optimization: {
      minimizer: [
        new UglifyJsPlugin({
          uglifyOptions: {
            output: { // 删除注释
              comments: false
            },
            //生产环境自动删除console
            compress: {
              //warnings: false, // 若打包错误，则注释这行
              drop_debugger: true,  //清除 debugger 语句
              drop_console: true,   //清除console语句
              pure_funcs: ['console.log']
            }
          },
          sourceMap: false,
          parallel: true
        })
      ]
    },
  },
  // 服务器设置
  devServer: {
    port: 9999, // 端口
    host: '0.0.0.0', // 允许外部ip访问 || localhost(本地)
    open: true, // 自动打开浏览器
    inline: true,// 用于设置代码保存时是否自动刷新页面
    hot: true, //热加载 -> 用于设置代码保存时是否进行热更新 (局部刷新，不刷新整个页面)
    // openPage: '/#/table',//运行项目后 自动打开的页面 hash的时候 需要使用/#/XX -> 非hash时则不用（/table是路由http://localhost:9999/xzl/#/table）
    // https: true, // 用于设置是否启用https
    compress: true, // gzip 压缩 用于减少服务器向前端传输的数据量，提高浏览的速度。

    proxy: {	 //配置多个跨域
      '/api': { //本地 这边的/api是配置默认请求的api ，这还需要在axios实例对象中设置
        // target: process.env.VUE_APP_BASEURL,//服务器代理的baseUrl
        //target: 'http://10.0.124.20:8090/xzl',
        //target: 'http://10.0.124.20:8030/xzl',
        target: 'http://10.0.124.20:8080',
        ws: true, // 是否代理websocket
        changeOrigin: true,//将主机头的来源更改为目标URL，也就是是否允许跨域
        pathRewrite: {// 重写路径: 去掉路径中开头的'/api'
          '^/api': ''
        }
      }
    }
  }
}

