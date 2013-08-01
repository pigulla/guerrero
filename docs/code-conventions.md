WIP
- if scope needs to be captured, assign it to `self`
- always prefer `Function.bind()` over `self` unless scope needs to be captured across multiple or nested functions
  (e.g., async.waterfall)
- you need a good reason to disabled jshint warnings

- two blank lines between method definitions
- one blank line between property definitions
