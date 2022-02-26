import {
   ArrayBindingElement,
   BindingElement,
   createPrinter,
   createSourceFile,
   EmitHint,
   Expression,
   factory,
   FunctionDeclaration,
   Identifier,
   isArrayBindingPattern,
   isBindingElement,
   isClassDeclaration,
   isFunctionDeclaration,
   isIdentifier,
   isObjectBindingPattern,
   isVariableStatement,
   LabeledStatement,
   MethodDeclaration,
   Modifier,
   NewLineKind,
   NodeArray,
   PropertyAssignment,
   ScriptTarget,
   ShorthandPropertyAssignment,
   SourceFile,
   Statement,
   SyntaxKind,
   transform,
   TransformerFactory,
   VariableDeclaration,
} from "typescript"
import { readFileSync, writeFileSync } from "fs"

function createImports(compile?: string) {
   if (!compile) return
   return factory.createImportDeclaration(
      undefined,
      undefined,
      factory.createImportClause(
         false,
         undefined,
         factory.createNamedImports([
            factory.createImportSpecifier(
               false,
               undefined,
               factory.createIdentifier(compile === "Injectable" ? "Service" : "ViewDef"),
            ),
         ]),
      ),
      factory.createStringLiteral("@mmuscat/angular-composition-api"),
   )
}

const metaKeys = {
   directive: [
      "selector",
      "providers",
      "queries",
      "moduleId",
      "inputs",
      "outputs",
      "host",
   ],
   component: [
      "selector",
      "template",
      "templateUrl",
      "style",
      "styles",
      "styleUrls",
      "providers",
      "queries",
      "moduleId",
      "encapsulation",
      "changeDetection",
      "inputs",
      "outputs",
      "host",
   ],
   injectable: [
      "name",
      "providedIn"
   ],
   pipe: [
      "name",
      "pure"
   ]
}

function isStaticPropertyStatement(statement: Statement): statement is FunctionDeclaration {
   return isFunctionDeclaration(statement) && !!statement.name && (statement.name.text === "ngTemplateContextGuard" || statement.name.text.startsWith("ngTemplateGuard_"))
}

function mapMetaKeys(properties: PropertyAssignment[]) {
   return properties.map((property) => {
      if ((property.name as any).escapedText === "style") {
         return factory.createPropertyAssignment(
            "styles",
            factory.createArrayLiteralExpression([property.initializer])
         )
      }
      return property
   })
}

function isLabelStatement(statement: Statement): statement is LabeledStatement {
   return statement.kind === SyntaxKind.LabeledStatement
}

function isCompileStatement(
   statement: Statement,
): statement is LabeledStatement {
   return (
      isLabelStatement(statement) && statement.label.escapedText === "compile"
   )
}

function createModule(file: SourceFile, compileStatementIndex: number) {
   let statements: Statement[] | NodeArray<Statement> = []
   if (compileStatementIndex > -1) {
      statements = file.statements.slice(
         0,
         compileStatementIndex
      )
   } else {
      statements = file.statements
   }

   return statements
}

function filterComponentMetaKeys(statement: LabeledStatement) {
   return metaKeys.component.includes(statement.label.text)
}

function filterDirectiveMetaKeys(statement: LabeledStatement) {
   return metaKeys.directive.includes(statement.label.text)
}

function filterPipeMetaKeys(statement: LabeledStatement) {
   return metaKeys.pipe.includes(statement.label.text)
}

function filterInjectableMetaKeys(statement: LabeledStatement) {
   return metaKeys.injectable.includes(statement.label.text)
}

function allowNone() {
   return false
}

function getCompileIdentifier(compileStatement?: LabeledStatement) {
   if (compileStatement) {
      const compileExpression = (compileStatement.statement as any).expression as Expression
      if (compileExpression.kind === SyntaxKind.Identifier) {
         const compileExpression = (compileStatement.statement as any).expression as Expression
         return (compileExpression as Identifier).text
      } else {
         throw new Error(`"compile:" label must be a Component, Directive, Injectable or Pipe identifier`)
      }
   }
}

function getMetaKeysFilter(compileStatement?: LabeledStatement): MetaKeysFilter {
   let metaKeysFilter: (value?: any) => boolean = allowNone

   const compile = getCompileIdentifier(compileStatement)

   if (compile) {
      switch (compile) {
         case "Component":
            metaKeysFilter = filterComponentMetaKeys
            break
         case "Directive":
            metaKeysFilter = filterDirectiveMetaKeys
            break
         case "Pipe":
            metaKeysFilter = filterPipeMetaKeys
            break
         case "Injectable":
            metaKeysFilter = filterInjectableMetaKeys
            break
         default:
            throw new Error(`"compile:" label must be a Component, Directive, Injectable or Pipe identifier`)
      }
   }

   return metaKeysFilter
}

type MetaKeysFilter = (value?: Statement) => boolean

function createMetadata(file: SourceFile, metaKeysFilter: MetaKeysFilter) {

   const properties = file.statements
      .filter(isLabelStatement)
      .filter(metaKeysFilter)
      .map(statement => factory.createPropertyAssignment(
         statement.label.text,
         (statement.statement as any).expression
      ))

   return factory.createObjectLiteralExpression(mapMetaKeys(properties), true)
}

function isExportModifier(modifier: Modifier) {
   return modifier.kind === SyntaxKind.ExportKeyword
}

function isExportStatement(statement: Statement) {
   return statement.modifiers?.some(isExportModifier)
}

function not(fn: (value: any) => boolean): (value: any) => boolean {
   return function (value: any) {
      return !fn(value)
   }
}

const removeExportModifier: TransformerFactory<Statement> = () => {
   return function(node) {
      if (isVariableStatement(node)) {
         return factory.createVariableStatement(node.modifiers?.filter(not(isExportModifier)), node.declarationList)
      }
      if (isFunctionDeclaration(node)) {
         return factory.createFunctionDeclaration(node.decorators, node.modifiers?.filter(not(isExportModifier)), node.asteriskToken, node.name, node.typeParameters, node.parameters, node.type, node.body)
      }
      if (isClassDeclaration(node)) {
         return factory.createClassDeclaration(node.decorators, node.modifiers?.filter(not(isExportModifier)), node.name, node.typeParameters, node.heritageClauses, node.members)
      }

      return node
   }
}

function extractArrayIdentifiers(elements: NodeArray<ArrayBindingElement>, identifiers: string[]) {
   extractObjectIdentifiers(elements.filter(isBindingElement), identifiers)
}

function extractObjectIdentifiers(elements: NodeArray<BindingElement> | BindingElement[], identifiers: string[]) {
   for (const element of elements) {
      if (isIdentifier(element.name)) {
         identifiers.push(element.name.text)
      }
      if (isObjectBindingPattern(element.name)) {
         extractObjectIdentifiers(element.name.elements, identifiers)
      }
      if (isArrayBindingPattern(element.name)) {
         extractArrayIdentifiers(element.name.elements, identifiers)
      }
   }
}

function extractVariableDeclarations(bindings: NodeArray<VariableDeclaration>): string[] {
   const identifiers: string[] = []
   for (const declaration of bindings) {
      if (isObjectBindingPattern(declaration.name)) {
         extractObjectIdentifiers(declaration.name.elements, identifiers)
      }
      if (isArrayBindingPattern(declaration.name)) {
         extractArrayIdentifiers(declaration.name.elements, identifiers)
      }
      if (isIdentifier(declaration.name)) {
         identifiers.push(declaration.name.text)
      }
   }
   return identifiers
}

function createSetupReturnStatement(statements: Statement[]) {
   const properties: ShorthandPropertyAssignment[] = []

   statements
      .filter(isExportStatement)
      .forEach((statement: any) => {
         if (isVariableStatement(statement)) {
            const assignments = extractVariableDeclarations(statement.declarationList.declarations)
               .map(identifier => factory.createShorthandPropertyAssignment(identifier))

            properties.push(...assignments)
         }
         if (isFunctionDeclaration(statement)) {
            if (!statement.name) {
               throw new Error("Exported function must be named")
            }
            properties.push(
               factory.createShorthandPropertyAssignment(statement.name.text)
            )
         }
         if (isClassDeclaration(statement)) {
            if (!statement.name) {
               throw new Error("Exported function must be named")
            }
            properties.push(
               factory.createShorthandPropertyAssignment(statement.name.text)
            )
         }
      })

   return factory.createReturnStatement(
      factory.createObjectLiteralExpression(properties, true)
   )
}

function createSetupBlock(file: SourceFile, metaKeysFilter: MetaKeysFilter, compileStatementIndex: number) {
   const statements = file.statements
      .slice(compileStatementIndex + 1)
      .filter((statement) => !(isLabelStatement(statement) && metaKeysFilter(statement)))

   statements.push(createSetupReturnStatement(statements))

   return factory.createBlock(transform(statements, [removeExportModifier]).transformed, true)
}

function createView(sourceFile: SourceFile, metaKeysFilter: MetaKeysFilter, setup: string) {
   return factory.createClassExpression(
      [
         factory.createDecorator(
            factory.createCallExpression(
               factory.createIdentifier("Component"),
               undefined,
               [createMetadata(sourceFile, metaKeysFilter)],
            ),
         ),
      ],
      [
         factory.createToken(SyntaxKind.ExportKeyword),
         factory.createToken(SyntaxKind.DefaultKeyword),
      ],
      "MyCounterComponent",
      [],
      [
         factory.createHeritageClause(SyntaxKind.ExtendsKeyword, [
            factory.createExpressionWithTypeArguments(
               factory.createCallExpression(
                  factory.createIdentifier("ViewDef"),
                  undefined,
                  [factory.createIdentifier(setup)],
               ),
               undefined,
            ),
         ]),
      ],
      [
         ...createStaticMethods(sourceFile)
      ],
   )
}

function createService(sourceFile: SourceFile, metaKeysFilter: MetaKeysFilter, setup: string) {
   return factory.createExportAssignment(
      undefined,
      [
         factory.createModifier(SyntaxKind.DefaultKeyword),
         factory.createModifier(SyntaxKind.ExportKeyword)
      ],
      undefined,
      factory.createNewExpression(
         factory.createIdentifier("Service"),
         undefined,
         [
            factory.createIdentifier(setup),
            createMetadata(sourceFile, metaKeysFilter)
         ],
      )
   )
}

function createDefaultNode(sourceFile: SourceFile, metaKeysFilter: MetaKeysFilter, setup: string, compile: string | undefined) {
   if (compile === "Injectable") {
      return createService(sourceFile, metaKeysFilter, setup)
   }
   else if (compile) {
      return createView(sourceFile, metaKeysFilter, setup)
   }
}

function emitFile(file: string, statements: any[], sourceFile: SourceFile) {
   const printer = createPrinter({ newLine: NewLineKind.LineFeed })
   const filename = file.replace(/\.ng$/, '.ts')
   let fileContents = ""
   statements.filter(Boolean).forEach((statement) => {
      fileContents += printer.printNode(EmitHint.Unspecified, statement, sourceFile)
      fileContents += "\n"
   })
   console.log(fileContents)
   writeFileSync(filename, fileContents, { encoding: "utf8" })
}

function createStaticMethods(file: SourceFile) {
   const staticPropertyStatements = file.statements.filter(isStaticPropertyStatement)
   const staticMethods: MethodDeclaration[] = []

   for (const property of staticPropertyStatements) {
      staticMethods.push(
         factory.createMethodDeclaration(
            property.decorators,
            [factory.createModifier(SyntaxKind.StaticKeyword)],
            property.asteriskToken,
            property.name!.text,
            property.questionToken,
            property.typeParameters,
            property.parameters,
            property.type,
            property.body
         )
      )
   }

   return staticMethods
}

function convert(file: string) {
   const fileContents = readFileSync(file, {
      encoding: "utf8",
   })
   const sourceFile = createSourceFile(
      "input.ts",
      fileContents,
      ScriptTarget.Latest,
   )
   const setup = factory.createUniqueName("setup")
   const compileStatement = sourceFile.statements.find(isCompileStatement)
   const metaKeysFilter = getMetaKeysFilter(compileStatement)
   const compileStatementIndex = sourceFile.statements.findIndex(isCompileStatement)
   const compile = getCompileIdentifier(compileStatement)
   const importsNode = createImports(compile)

   const moduleNodes = createModule(sourceFile, compileStatementIndex)

   const setupNode = factory.createFunctionExpression(
      undefined,
      undefined,
      setup.text,
      undefined,
      undefined,
      undefined,
      createSetupBlock(sourceFile, metaKeysFilter, compileStatementIndex)
   )

   const defaultNode = createDefaultNode(sourceFile, metaKeysFilter, setup.text, compile)

   emitFile(file, [
      importsNode,
      ...moduleNodes,
      setupNode,
      defaultNode
   ], sourceFile)
}

convert(process.argv[2])
