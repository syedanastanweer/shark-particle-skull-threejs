const { merge } = require('webpack-merge');
const path = require('path');
const commonConfiguration = require('./webpack.common.js');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
module.exports = merge(
    commonConfiguration,
    {
        mode: 'production',
        devtool: false,
        output: {
            path: path.resolve(__dirname, '../public'), // Adjust the path if necessary
            filename: '[name].[contenthash].js',
            assetModuleFilename: 'assets/[hash][ext][query]' // for other static assets
        },
        module: {
            rules: [
                {
                    test: /\.(glb|gltf)$/,
                    type: 'asset/resource',
                    generator: {
                        filename: 'static/models/gltf/[name][ext]' // Output the models in the correct directory
                    }
                }
            ]
        },
        plugins: [
            new CleanWebpackPlugin(), // Cleans the output directory before each build
        ]
    }
);