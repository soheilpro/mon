# mon
Painless performance monitoring for Windows.

![Screenshot](/SCREENSHOT.png "Screenshot")

## Features
- Monitor local and remote servers.
- Completely customizable.
- Support for thresholds.
- Support for statistical functions.
- Support for lists.
- Support for variables.
- Support for custom number formats.
- Automatic process ID to IIS application pool mapping

## Install

```
npm install -g monjs
```

## Usage

Monitor the local machine:

```
mon [<configfile>]
```

Monitor a remote machine:

```
mon --server <address>:<port> [<configfile>]
```

<b>Note:</b> If no config file is specified, the default (and very simple) config is used.

Start a server that lets client connect to and monitor the local machine:

```
mon serve [--port <port>]
```

<b>Warning 1:</b> There is no authentication mechanism in this version. Any person who knows the address and port of the server can connect and view its status. Make sure to have proper firewall settings in place.

<b>Warning 2:</b> Data is sent in plain text over an unencrypted HTTP connection in this version. HTTPS support will be added soon.

## Config File

To use mon you need to provide it with a config file that specifies which metrics you want to monitor.
There are some sample config files in the config directory that you can use as a template.

The format of the config file is as follows:

<pre>
{
  "groups": [
    {
      <b># Name of the group</b>
      "name": "CPU",

      <b># Index of column to display this group in. (Default is 1)</b>
      "column": 1,

      <b># Array of counters to show in this group</b>
      "counters": [

        <b># Simple format:</b>
        <b># Name of the Performance Counter</b>
        "\\Processor(_Total)\\% Processor Time",

        <b># - OR -</b>

        <b># Detailed format:</b>
        {
          <b># Name of the Performance Counter</b>
          "id": "\\Processor(_Total)\\% Processor Time",

          <b># Display name for the counter (Optional)</b>
          "name": "Total",

          <b># Format (Default is "0,0")</b>
          <b># See numeraljs.com for a list of available formats.</b>
          "format": "0,0",

          <b># Threshold values for the counter (Optional)</b>
          <b># Valid values are: <em>ok</em>, <em>warning</em> and <em>critical</em></b>
          "threshold": {
            "50": "ok",
            "75": "warning",
            "*": "critical"
          },

          <b># Statistical functions to calculate and display (Optional)</b>
          <b># Currently supported functions are: <em>avg</em> and <em>sum</em></b>
          <b># The first argument is the number of samples.</b>
          "stats": [
            "avg(60)",
            "sum(1200)"
          ]
        }
      },

      <b># Array of lists to show in this group</b>
      "lists": [
        {
          <b># Name of the list</b>
          "name": "CPU Usage",

          <b># Name of the Performance Counter to generate the list from</b>
          <b># It must have an asterisk (*) as the instance name.</b>
          "id": "\\Process(*)\\% Processor Time",

          <b># Maximum number of items to show (Default is 5)</b>
          "count": 5,

          <b># Sorting order (Default is desc)</b>
          <b># Valid values are <em>asc</em> and <em>desc</em>.</b>
          "sort": "desc",

          <b># Items to exclude from the list (Optional)</b>
          "exclude": [
            "_Total",
            "Idle"
          ],

          <b># OMG! Lists support thresholds as well. (Optional)</b>
          "threshold": {
            "400": "ok",
            "800": "warning",
            "*": "critical"
          },

          <b># Lists support statistical functions too. How cool is that? (Optional)</b>
          "stats": [
            "avg(60)"
          ]
        }
      ]
    }
  ]
}
</pre>

## Counters
The primary usage of mon is to view values of various Performance Counters that are available in Windows.

To monitor a counter, simply specify its name in the list of counters:

<pre>
counters: [
  "\\Processor(_Total)\\% Processor Time",
  "\\Processor(_Total)\\% Privileged Time",
  "\\Processor(_Total)\\% User Time"
]
</pre>

If you need to specify other properties for the counter like format or threshold, use the detailed format:

<pre>
counters: [
  {
    "name": "Used Memory",
    "id": "\\Process(_Total)\\Working Set",
    "format": "0.000 b"
  },
  {
    "name": "Free Memory",
    "id": "\\Memory\\Available Bytes",
    "format": "0.000 b"
  }
]
</pre>

## Thresholds
There are three levels of threshold (ok, warning, critical) that you can set for each counter to easily see if they are above or below the desired value.

<pre>
counters: [
  {
    "name": "Free Memory",
    "id": "\\Memory\\Available Bytes",
    "threshold": {
      "1000000000": "critical",
      "2000000000": "warning",
      "*": "ok"
    }
  }
]
</pre>

## Statistical Functions
To get a clearer understanding of how some metrics are doing, you can apply statistical functions like <b>avg</b> and <b>sum</b> to counters.

The following example displays the 60-sample moving average of the % Processor Time counter:

<pre>
"counters": [
  {
    "id": "\\Processor(_Total)\\% Processor Time",
    "name": "CPU Usage",
    "stats": [
      "avg(60)"
    ]
  }
]
</pre>

## Lists
In addition to displaying values of counters, mon is able to retrieve values of all instances of a counter and compile them into a list. This is very useful for monitoring metrics like top CPU or memory usage.

Lists support thresholds and statistical functions too.

The following example displays a list of top 10 CPU intensive processes along with the 60-sample moving average of the list to provide a better view of the system performance:

<pre>
lists: [
  {
    "name": "CPU Usage",
    "id": "\\Process(*)\\% Processor Time",
    "count": 10,
    "sort": "desc",
    "exclude": [
      "_Total",
      "Idle"
    ],
    "threshold": {
      "400": "ok",
      "800": "warning",
      "*": "critical"
    },
    "stats": [
      "avg(60)"
    ]
  }
]
</pre>

## Variables
Sometimes you need to monitor a set of similar metrics for different applications (for example multiple ASP.NET web sites). Instead of creating a separate config file for each of these applications, you can create a single config file and use variables instead.

In your config file replace the name of the instance with your variable:

<pre>
"counters": [
  "\\Web Service(%apppool%)\\Current Connections",
  "\\W3SVC_W3WP(%apppool%)\\Active Requests",
]
</pre>

and supply a value for it at startup:

```
mon [<configfile>] --var apppool=mysite1
mon --server <address>:<port> [<configfile>] --var apppool=mysite1
```

## Process IDs
By default, Performance Counters report multiple processes that have the same name by appending a number to their name (like w3wp#1, w3wp#2, etc).

To have them append the ID of the process instead (like w3wp_1234), follow the instructions in this article: [KB281884](http://support.microsoft.com/kb/281884).

This allows mon to map w3wp processes to their corresponding IIS application pools.

## Version History
+ **1.0**
	+ Initial release

## Author
**Soheil Rashidi**

+ http://soheilrashidi.com
+ http://twitter.com/soheilpro
+ http://github.com/soheilpro

## Copyright and License
Copyright 2014 Soheil Rashidi

Licensed under the The MIT License (the "License");
you may not use this work except in compliance with the License.
You may obtain a copy of the License in the LICENSE file, or at:

http://www.opensource.org/licenses/mit-license.php

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
