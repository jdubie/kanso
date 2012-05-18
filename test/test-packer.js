var path = require('path'),
	Packer = require('../lib/packer.js');

function packagePath(pkg) {
	return path.resolve(__dirname,'testapps', pkg);
}

function testPackage(pkg, expectedPaths) {
	var pkgPath = packagePath(pkg);
	expectedPaths = expectedPaths.map(function(p) {return path.normalize(p);});
	return function(test) {
		var actualPaths = [];

		Packer(pkgPath).
		on('error', function(err) {
			test.fail(err);
			test.done();
		}).
		on('entry', function(entry) {
			actualPaths.push(path.relative(pkgPath, entry.path));
		}).
		on('close', function() {
			test.same(actualPaths, expectedPaths);
			test.done();
		});
	};
}

exports.basicPackage = testPackage('pack_basic', ['kanso.json','README.md']);
exports.ignoreFile = testPackage('pack_with_ignored_files', ['.kansoignore','kanso.json','README.md']);
exports.pack_with_deps = testPackage('pack_with_deps', ['index.html','kanso.json']);
exports.pack_with_bundled_deps = testPackage('pack_with_bundled_deps', ['example.js','kanso.json', 'packages/bundledpkg/kanso.json']);