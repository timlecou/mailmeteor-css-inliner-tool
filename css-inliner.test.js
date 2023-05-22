const { JSDOM } = require("jsdom");
const fs = require("fs");
const path = require("path");

let dom;
let container;

/**
 * Build the DOM and resolve tested functions before each test
 */
beforeEach(() => {
  const html = fs.readFileSync(
    path.resolve(__dirname, "css-inliner.html"),
    "utf-8"
  );
  dom = new JSDOM(html, { runScripts: "dangerously" });
  container = dom.window.document;
});

test("parseCSS function with 2 rules", () => {
  const html = `<style>body {background-color: red; color: white; font-size: 14px;} .button {color: blue}</style>`;
  const html_dom = new JSDOM(html);
  const document = html_dom.window.document;

  const stylesheets = document.querySelectorAll("style");

  const result = dom.window.parseCSS(stylesheets);

  expect(result).toEqual({
    body: {
      "background-color": "red",
      color: "white",
      "font-size": "14px",
    },
    ".button": {
      color: "blue",
    },
  });
});

test("parseCSS function with 50 rules", () => {
  let html = "<style>";
  const expectedCssObject = {};

  // Generate 50 rules
  for (let i = 0; i < 50; i++) {
    html += `div#id${i} { color: rgb(${i},${i},${i}); background-color: rgb(${
      i * 2
    },${i * 2},${i * 2}); } `;
    expectedCssObject[`div#id${i}`] = {
      color: `rgb(${i},${i},${i})`,
      "background-color": `rgb(${i * 2},${i * 2},${i * 2})`,
    };
  }
  html += "</style>";

  const html_dom = new JSDOM(html);
  const document = html_dom.window.document;

  const stylesheets = document.querySelectorAll("style");

  const result = dom.window.parseCSS(stylesheets);

  expect(result).toEqual(expectedCssObject);
});

test("parseCSS function with media queries", () => {
  let html = `<style>
      div#id1 { color: rgb(1,1,1); background-color: rgb(2,2,2); }
      @media (max-width: 600px) {
        div#id1 { color: rgb(2,2,2); background-color: rgb(3,3,3); }
      }
    </style>`;

  const expectedCssObject = {
    "div#id1": {
      color: `rgb(1,1,1)`,
      "background-color": `rgb(2,2,2)`,
    },
  };

  const html_dom = new JSDOM(html);
  const document = html_dom.window.document;

  const stylesheets = document.querySelectorAll("style");

  const result = dom.window.parseCSS(stylesheets);

  expect(result).toEqual(expectedCssObject);
});

test("injectInlineStyles function", () => {
  const css_rules = {
    body: {
      "background-color": "red",
    },
  };

  dom.window.injectInlineStyles(css_rules, container);

  expect(container.body.style.backgroundColor).toBe("red");
});

test("injectInlineStyles function with multiple properties", () => {
  const css_rules = {
    body: {
      "background-color": "blue",
      color: "white",
      "font-size": "16px",
    },
  };

  dom.window.injectInlineStyles(css_rules, container);

  expect(container.body.style.backgroundColor).toBe("blue");
  expect(container.body.style.color).toBe("white");
  expect(container.body.style.fontSize).toBe("16px");
});

test("injectInlineStyles function with complex selector", () => {
  const css_rules = {
    "body #myDiv": {
      "background-color": "green",
      border: "1px solid black",
      padding: "10px",
    },
  };

  const div = container.createElement("div");
  div.id = "myDiv";
  container.body.appendChild(div);

  dom.window.injectInlineStyles(css_rules, container);

  expect(div.style.backgroundColor).toBe("green");
  expect(div.style.border).toBe("1px solid black");
  expect(div.style.padding).toBe("10px");
});

test("injectInlineStyles function with multiple selectors", () => {
  const css_rules = {
    body: {
      "background-color": "yellow",
      "font-family": "Arial, sans-serif",
    },
    "body #myDiv": {
      color: "blue",
      "text-align": "center",
    },
  };

  const div = container.createElement("div");
  div.id = "myDiv";
  container.body.appendChild(div);

  dom.window.injectInlineStyles(css_rules, container);

  expect(container.body.style.backgroundColor).toBe("yellow");
  expect(container.body.style.fontFamily).toBe("Arial, sans-serif");
  expect(div.style.color).toBe("blue");
  expect(div.style.textAlign).toBe("center");
});

test("convertStyleToInline function is called", () => {
  const form = container.getElementById("inputForm");
  const inputTextArea = container.getElementById("inputTextArea");
  const resultTextArea = container.getElementById("resultTextArea");

  inputTextArea.value =
    '<!DOCTYPE html><head></head><body style="background-color: red;"><p>Test</p></body>';

  // Create a mock function
  const mockFn = jest.fn(dom.window.convertStyleToInline);

  // Replace the original function with the mock function
  form.removeEventListener("submit", dom.window.convertStyleToInline);
  form.addEventListener("submit", mockFn);

  const event = new dom.window.Event("submit");

  // Trigger the event
  form.dispatchEvent(event);

  // Check if the mock function has been called
  expect(mockFn).toHaveBeenCalled();

  expect(resultTextArea.value).toBe(
    '<html><head></head><body style="background-color: red;"><p>Test</p></body></html>'
  );
});

test("convertStyleToInline function doesnt remove inline style", () => {
  const form = container.getElementById("inputForm");
  const inputTextArea = container.getElementById("inputTextArea");
  const resultTextArea = container.getElementById("resultTextArea");

  inputTextArea.value =
    '<!DOCTYPE html><head></head><body style="background-color: red;"><p>Test</p></body>';

  const event = new dom.window.Event("submit");

  form.dispatchEvent(event);
  expect(resultTextArea.value).toBe(
    '<html><head></head><body style="background-color: red;"><p>Test</p></body></html>'
  );
});
