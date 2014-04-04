describe("Interpolation Markup", function() {
  it ('does nothing when there are no expressions', function() {
    var result = interpolator.compile(document.createTextNode("some text"));
    expect(result).toBeUndefined();
  });

  it ('does nothing when empty', function() {
    var result = ko.punches.interpolationMarkup.preprocessor(document.createTextNode(""));
    expect(result).toBeUndefined();
  });

  it ('does not parse unclosed binding', function() {
    var result = ko.punches.interpolationMarkup.preprocessor(document.createTextNode("some {{ text"));
    expect(result).toBeUndefined();
  });

  it ('does not parse unopened binding', function() {
    var result = ko.punches.interpolationMarkup.preprocessor(document.createTextNode("some }} text"));
    expect(result).toBeUndefined();
  });

  it ('creates binding from {{...}} expression', function() {
    var result = ko.punches.interpolationMarkup.preprocessor(document.createTextNode("some {{ expr }} text"));
    expect(result).toHaveNodeTypes([3, 8, 8, 3]);   // text, comment, comment, text
  });

  it ('ignores unmatched delimiters', function() {
    var result = ko.punches.interpolationMarkup.preprocessor(document.createTextNode("some {{ expr }} }} text"));
    expect(result).toHaveNodeTypes([3, 8, 8, 3]);   // text, comment, comment, text
  });

  it ('supports two expressions', function() {
    var result = ko.punches.interpolationMarkup.preprocessor(document.createTextNode("some {{ expr1 }} middle {{ expr2 }} text"));
    expect(result).toHaveNodeTypes([3, 8, 8, 3, 8, 8, 3]);   // text, comment, comment, text, comment, comment, text
  });

  it ('skips empty text', function() {
    var result = ko.punches.interpolationMarkup.preprocessor(document.createTextNode("{{ expr1 }}{{ expr2 }}"));
    expect(result).toHaveNodeTypes([8, 8, 8, 8]);   // comment, comment, comment, comment
  });

  it ('supports more than two expressions', function() {
    var result = ko.punches.interpolationMarkup.preprocessor(document.createTextNode("x {{ expr1 }} y {{ expr2 }} z {{ expr3 }}"));
    expect(result).toHaveNodeTypes([3, 8, 8, 3, 8, 8, 3, 8, 8]);   // text, comment, comment, text, comment, comment, text, comment, comment
  });
});

describe("Interpolation Markup bindings", function() {
  beforeEach(jasmine.prepareTestNode);

  var savePreprocessNode = ko.bindingProvider.instance.preprocessNode;
  beforeEach(ko.punches.interpolationMarkup.enable);
  afterEach(function() { ko.bindingProvider.instance.preprocessNode = savePreprocessNode; });

  it ('Should replace {{...}} expression with virtual text binding', function() {
    testNode.innerHTML = "hello {{'name'}}!";
    ko.applyBindings(null, testNode);
    expect(testNode).toContainText("hello name!");
    expect(testNode).toContainHtml("hello <!--ko text:'name'-->name<!--/ko-->!");
  });

  it ('Should replace multiple expressions', function() {
    testNode.innerHTML = "hello {{'name'}}{{'!'}}";
    ko.applyBindings(null, testNode);
    expect(testNode).toContainText("hello name!");
  });

  it ('Should support any content of expression, including functions and {{}}', function() {
    testNode.innerHTML = "hello {{ (function(){return '{{name}}'}()) }}!";
    ko.applyBindings(null, testNode);
    expect(testNode).toContainText("hello {{name}}!");
  });

  it ('Should ignore unmatched }} and {{', function() {
    testNode.innerHTML = "hello }}'name'{{'!'}}{{";
    ko.applyBindings(null, testNode);
    expect(testNode).toContainText("hello }}'name'!{{");
  });

  it ('Should update when observable changes', function() {
    testNode.innerHTML = "The best {{what}}.";
    var observable = ko.observable('time');
    ko.applyBindings({what: observable}, testNode);
    expect(testNode).toContainText("The best time.");
    observable('fun');
    expect(testNode).toContainText("The best fun.");
  });

  it ('Should be able to override wrapExpresssion to define a different set of elements', function() {
    var originalWrapExpresssion = ko.punches.interpolationMarkup.wrapExpresssion;
    this.after(function() {
      ko.punches.interpolationMarkup.wrapExpresssion = originalWrapExpresssion;
    });

    ko.punches.interpolationMarkup.wrapExpresssion = function(expressionText) {
      return originalWrapExpresssion('"--" + ' + expressionText + ' + "--"');
    }

    testNode.innerHTML = "hello {{'name'}}!";
    ko.applyBindings(null, testNode);
    expect(testNode).toContainText("hello --name--!");
  });
});

describe("Attribute Interpolation Markup preprocessor", function() {
  var testNode;
  beforeEach(function () {
    testNode = document.createElement("div");
  });

  it ('Should do nothing when there are no expressions', function() {
    testNode.setAttribute('title', "some text");
    ko.punches.attributeInterpolationMarkup.preprocessor(testNode);
    expect(testNode.title).toEqual('some text');
    expect(testNode.getAttribute('data-bind')).toBe(null);
  });

  it ('Should do nothing when empty', function() {
    testNode.setAttribute('title', "");
    ko.punches.attributeInterpolationMarkup.preprocessor(testNode);
    expect(testNode.title).toEqual('');
    expect(testNode.getAttribute('data-bind')).toBe(null);
  });

  it ('does not parse unclosed binding', function() {
    testNode.setAttribute('title', "some {{text");
    ko.punches.attributeInterpolationMarkup.preprocessor(testNode);
    expect(testNode.title).toEqual('some {{text');
    expect(testNode.getAttribute('data-bind')).toBe(null);
  });

  it ('does not parse unopened binding', function() {
    testNode.setAttribute('title', "some}} text");
    ko.punches.attributeInterpolationMarkup.preprocessor(testNode);
    expect(testNode.title).toEqual('some}} text');
    expect(testNode.getAttribute('data-bind')).toBe(null);
  });

  it ('Should create binding from {{...}} expression', function() {
    testNode.setAttribute('title', "some {{expr}} text");
    ko.punches.attributeInterpolationMarkup.preprocessor(testNode);
    expect(testNode.title).toEqual('');
    expect(testNode.getAttribute('data-bind')).toEqual('attr.title:""+"some "+ko.unwrap(expr)+" text"');
  });

  it ('Should ignore unmatched delimiters', function() {
    testNode.setAttribute('title', "some {{expr1}}expr2}} text");
    ko.punches.attributeInterpolationMarkup.preprocessor(testNode);
    expect(testNode.title).toEqual('');
    expect(testNode.getAttribute('data-bind')).toEqual('attr.title:""+"some "+ko.unwrap(expr1}}expr2)+" text"');
  });

  it ('Should support two expressions', function() {
    testNode.setAttribute('title', "some {{expr1}} middle {{expr2}} text");
    ko.punches.attributeInterpolationMarkup.preprocessor(testNode);
    expect(testNode.title).toEqual('');
    expect(testNode.getAttribute('data-bind')).toEqual('attr.title:""+"some "+ko.unwrap(expr1)+" middle "+ko.unwrap(expr2)+" text"');
  });

  it ('Should skip empty text', function() {
    testNode.setAttribute('title', "{{expr1}}{{expr2}}");
    ko.punches.attributeInterpolationMarkup.preprocessor(testNode);
    expect(testNode.title).toEqual('');
    expect(testNode.getAttribute('data-bind')).toEqual('attr.title:""+ko.unwrap(expr1)+ko.unwrap(expr2)');
  });

  it ('Should support more than two expressions', function() {
    testNode.setAttribute('title', "x {{expr1}} y {{expr2}} z {{expr3}}");
    ko.punches.attributeInterpolationMarkup.preprocessor(testNode);
    expect(testNode.title).toEqual('');
    expect(testNode.getAttribute('data-bind')).toEqual('attr.title:""+"x "+ko.unwrap(expr1)+" y "+ko.unwrap(expr2)+" z "+ko.unwrap(expr3)');
  });

  it ('Should create simple binding for single expression', function() {
    testNode.setAttribute('title', "{{expr1}}");
    ko.punches.attributeInterpolationMarkup.preprocessor(testNode);
    expect(testNode.title).toEqual('');
    expect(testNode.getAttribute('data-bind')).toEqual('attr.title:expr1');
  });

  it ('Should append to existing data-bind', function() {
    testNode.setAttribute('title', "{{expr1}}");
    testNode.setAttribute('data-bind', "text:expr2");
    ko.punches.attributeInterpolationMarkup.preprocessor(testNode);
    expect(testNode.title).toEqual('');
    expect(testNode.getAttribute('data-bind')).toEqual('text:expr2,attr.title:expr1');
  });

  it ('does not match expressions in data-bind', function() {
    testNode.setAttribute('data-bind', "text:'{{xyz}}'");
    ko.punches.attributeInterpolationMarkup.preprocessor(testNode);
    expect(testNode.getAttribute('data-bind')).toEqual("text:'{{xyz}}'");
  });

  it ('Should support expressions in multiple attributes', function() {
    testNode.setAttribute('title', "{{expr1}}");
    testNode.setAttribute('class', "test");
    testNode.setAttribute('id', "{{expr2}}");
    testNode.setAttribute('data-test', "{{expr3}}");
    ko.punches.attributeInterpolationMarkup.preprocessor(testNode);
    expect(testNode.getAttribute('data-bind')).toEqual('attr.data-test:expr3,attr.id:expr2,attr.title:expr1'); // the order shouldn't matter
  });
});

describe("Attribute Interpolation Markup bindings", function() {
  beforeEach(jasmine.prepareTestNode);

  var savePreprocessNode = ko.bindingProvider.instance.preprocessNode;
  beforeEach(ko.punches.attributeInterpolationMarkup.enable);
  afterEach(function() { ko.bindingProvider.instance.preprocessNode = savePreprocessNode; });

  it ('Should replace {{...}} expression in attribute', function() {
    testNode.innerHTML = "<div title='hello {{\"name\"}}!'></div>";
    ko.applyBindings(null, testNode);
    expect(testNode.childNodes[0].title).toEqual("hello name!");
  });

  it ('Should replace multiple expressions', function() {
    testNode.innerHTML = "<div title='hello {{\"name\"}}{{\"!\"}}'></div>";
    ko.applyBindings(null, testNode);
    expect(testNode.childNodes[0].title).toEqual("hello name!");
  });

  it ('Should support any content of expression, including functions and {{}}', function() {
    testNode.innerHTML = "<div title='hello {{ (function(){return \"{{name}}\"}()) }}!'></div>";
    ko.applyBindings(null, testNode);
    expect(testNode.childNodes[0].title).toEqual("hello {{name}}!");
  });

  it ('Should properly handle quotes in text sections', function() {
    testNode.innerHTML = "<div title='This is \"great\" {{\"fun\"}} with &apos;friends&apos;'></div>";
    ko.applyBindings(null, testNode);
    expect(testNode.childNodes[0].title).toEqual("This is \"great\" fun with 'friends'");
  });

  it ('Should ignore unmatched }} and {{', function() {
    testNode.innerHTML = "<div title='hello }}\"name\"{{\"!\"}}{{'></div>";
    ko.applyBindings(null, testNode);
    expect(testNode.childNodes[0].title).toEqual("hello }}\"name\"!{{");
  });

  it ('Should support expressions in multiple attributes', function() {
    testNode.innerHTML = "<div title='{{title}}' id='{{id}}' class='test class' data-test='hello {{\"name\"}}!' data-bind='text:content'></div>";
    ko.applyBindings({title: 'the title', id: 'test id', content: 'content'}, testNode);
    expect(testNode).toContainText("content");
    expect(testNode.childNodes[0].title).toEqual("the title");
    expect(testNode.childNodes[0].id).toEqual("test id");
    expect(testNode.childNodes[0].className).toEqual("test class");
    expect(testNode.childNodes[0].getAttribute('data-test')).toEqual("hello name!");
  });

  it ('Should update when observable changes', function() {
    testNode.innerHTML = "<div title='The best {{what}}.'></div>";
    var observable = ko.observable('time');
    ko.applyBindings({what: observable}, testNode);
    expect(testNode.childNodes[0].title).toEqual("The best time.");
    observable('fun');
    expect(testNode.childNodes[0].title).toEqual("The best fun.");
  });
});