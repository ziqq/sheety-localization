const { transformSync } = require('esbuild');

module.exports = {
  process(sourceText, sourcePath) {
    const result = transformSync(sourceText, {
      format: 'esm',
      loader: 'ts',
      sourcefile: sourcePath,
      sourcemap: 'inline',
      target: 'es2020',
    });

    return {
      code: result.code,
      map: result.map ?? null,
    };
  },
};
