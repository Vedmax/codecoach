import { basename } from 'path';
import slash from 'slash';

import { Log } from '../Logger';
import { getRelativePath } from './utils/path.util';
import { Parser } from './@interfaces/parser.interface';
import { LintItem } from './@types';
import { mapSeverity } from './utils/dotnetSeverityMap';
import { splitByLine } from './utils/lineBreak.util';
import { ProjectType } from '../Config/@enums';
import { NoNaN } from './utils/number.util';

export class DotnetBuildParser extends Parser {
  parse(content: string): LintItem[] {
    return splitByLine(content)
      .map((log) => this.toLintItem(log))
      .filter((log) => log);
  }

  private toLintItem(log: string): LintItem {
    const structureMatch = log.match(
      /(?:[\d:>]+)?([^ ()]+)(?:\((\d+),(\d+)\))? *: *(\w+) *(\w+) *: *([^\[]+)(?:\[(.+)])?$/,
    );
    if (!structureMatch) {
      const message = "DotnetBuildParser Error: log structure doesn't match";
      Log.error(message, { log });
      throw new Error(message);
    }

    const [
      ,
      src,
      _line,
      _lineOffset,
      severityText,
      errorCode,
      content,
      _csproj,
    ] = structureMatch;

    const relativeSrcPath = getRelativePath(this.cwd, src);

    if (!relativeSrcPath) {
      Log.warn(`DotnetBuildParser Error: source path is not a relative to root`, {
        src,
      });
    }

    return {
      ruleId: errorCode,
      log,
      line: NoNaN(_line),
      lineOffset: NoNaN(_lineOffset),
      msg: `${errorCode.trim()}: ${content.trim()}`,
      source: relativeSrcPath ?? basename(slash(_csproj)),
      severity: mapSeverity(severityText),
      valid: !!relativeSrcPath,
      type: ProjectType.dotnetbuild,
    };
  }
}
